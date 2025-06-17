import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const bookingId = params.id;

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings (
          title,
          images,
          daily_rate,
          deposit_amount
        ),
        owner_profile:owner_id (
          full_name,
          avatar_url,
          stripe_account_id,
          stripe_onboarding_complete
        )
      `)
      .eq('id', bookingId as any)
      .eq('renter_id', user.id as any) // Ensure user can only access their own bookings
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const bookingData = booking as any;

    // If payment is already completed, return without client secret
    if (bookingData.payment_status === 'paid') {
      return NextResponse.json({
        booking: {
          ...bookingData,
          client_secret: null, // Don't expose client secret for completed payments
        }
      });
    }

    // If booking doesn't have a payment intent yet, create one
    if (!bookingData.stripe_payment_intent_id) {
      // Check if owner has completed Stripe setup
      if (!bookingData.owner_profile?.stripe_onboarding_complete) {
        return NextResponse.json({
          booking: {
            ...bookingData,
            client_secret: null,
          },
          error: 'Owner payment setup incomplete'
        });
      }

      // Create payment intent
      const totalAmountCents = Math.round((bookingData.total_amount + bookingData.deposit_amount) * 100);
      const platformFeeCents = Math.round(bookingData.service_fee * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountCents,
        currency: 'aud',
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: bookingData.owner_profile.stripe_account_id,
        },
        metadata: {
          booking_id: bookingId,
          listing_id: bookingData.listing_id,
          renter_id: user.id,
          owner_id: bookingData.owner_id,
          total_amount: bookingData.total_amount.toString(),
          service_fee: bookingData.service_fee.toString(),
          deposit_amount: bookingData.deposit_amount.toString(),
        },
        description: `Rent It Forward: ${bookingData.listings.title}`,
        on_behalf_of: bookingData.owner_profile.stripe_account_id,
      });

      // Update booking with payment intent ID
      await supabase
        .from('bookings')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'pending'
        } as any)
        .eq('id', bookingId as any);

      return NextResponse.json({
        booking: {
          ...bookingData,
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'pending',
          client_secret: paymentIntent.client_secret,
          stripe_account_id: bookingData.owner_profile.stripe_account_id,
        }
      });
    }

    // If payment intent exists, retrieve it to get the client secret
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(bookingData.stripe_payment_intent_id);
      
      return NextResponse.json({
        booking: {
          ...bookingData,
          client_secret: paymentIntent.client_secret,
          stripe_account_id: bookingData.owner_profile?.stripe_account_id,
        }
      });
    } catch (stripeError) {
      console.error('Error retrieving payment intent:', stripeError);
      return NextResponse.json({ error: 'Payment setup error' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in booking payment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 