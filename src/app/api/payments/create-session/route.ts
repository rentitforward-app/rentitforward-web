import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const { bookingId, userId } = await request.json();

    if (!bookingId || !userId) {
      return NextResponse.json(
        { error: 'Booking ID and User ID are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!listing_id (
          id,
          title,
          images,
          price_per_day,
          category,
          location,
          state
        ),
        profiles!owner_id (
          id,
          full_name,
          email,
          stripe_account_id
        )
      `)
      .eq('id', bookingId)
      .eq('renter_id', userId)
      .eq('status', 'payment_required')
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or not eligible for payment' },
        { status: 404 }
      );
    }

    const ownerStripeAccount = booking.profiles?.stripe_account_id;
    const platformFeeRate = 0.05; // 5% platform fee
    const platformFee = Math.round(booking.subtotal * platformFeeRate * 100); // Convert to cents
    const totalAmount = booking.total_amount * 100; // Convert to cents

    // Construct base URL from request or environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;

    // Determine payment intent data based on whether owner has connected account
    const paymentIntentData: any = {
      metadata: {
        bookingId,
        userId,
        ownerId: booking.owner_id,
        platformFee: platformFee.toString(),
        hasConnectedAccount: ownerStripeAccount ? 'true' : 'false',
      },
    };

    // Only add application fee and transfer data if owner has connected account
    if (ownerStripeAccount) {
      paymentIntentData.application_fee_amount = platformFee;
      paymentIntentData.transfer_data = {
        destination: ownerStripeAccount,
      };
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      payment_intent_data: paymentIntentData,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `Rental: ${booking.listings.title}`,
              description: `${booking.start_date} to ${booking.end_date}`,
              images: booking.listings.images?.length > 0 ? [booking.listings.images[0]] : [],
              metadata: {
                bookingId,
                category: booking.listings.category,
                location: `${booking.listings.city}, ${booking.listings.state}`,
              },
            },
            unit_amount: booking.subtotal * 100, // Subtotal in cents
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Service Fee',
              description: 'Platform service fee',
            },
            unit_amount: booking.service_fee * 100, // Service fee in cents
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Security Deposit',
              description: 'Refundable security deposit (held until return)',
            },
            unit_amount: booking.deposit_amount * 100, // Deposit in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId,
        userId,
        ownerId: booking.owner_id,
        type: 'booking_payment',
      },
      success_url: `${baseUrl}/bookings/${bookingId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/bookings/${bookingId}/payment?cancelled=true`,
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['AU'],
      },
      customer_email: booking.profiles?.email,
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    });

    // Update booking with Stripe session ID
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        stripe_session_id: session.id,
        payment_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking with session ID:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}