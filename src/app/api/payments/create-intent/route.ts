import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings:listing_id (
          title,
          owner_id,
          profiles:owner_id (
            stripe_account_id
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Create payment intent using Stripe
    const amountInCents = Math.round(booking.total_amount * 100);
    
    // Import Stripe utilities from shared package
    const { createPaymentIntent } = await import('rentitforward-shared/src/utils/stripe');
    
    const paymentIntent = await createPaymentIntent({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        listingId: booking.listing_id,
        renterId: booking.renter_id,
        ownerId: booking.owner_id,
        listingTitle: booking.listings.title,
      },
    });

    // Update booking with payment intent ID
    await supabase
      .from('bookings')
      .update({ 
        stripe_payment_intent_id: paymentIntent.id,
        status: 'payment_pending'
      })
      .eq('id', booking.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      currency: 'usd',
      bookingId: booking.id,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}