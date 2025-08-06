import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, bookingId } = await request.json();

    if (!paymentIntentId || !bookingId) {
      return NextResponse.json(
        { error: 'Payment intent ID and booking ID are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify payment with Stripe (using shared utilities)
    const { retrievePaymentIntent } = await import('rentitforward-shared/src/utils/stripe');
    
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not successful' },
        { status: 400 }
      );
    }

    // Update booking status to confirmed
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select(`
        *,
        listings:listing_id (
          title,
          owner_id,
          profiles:owner_id (
            full_name,
            email
          )
        )
      `)
      .single();

    if (updateError || !booking) {
      console.error('Booking update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm booking' },
        { status: 500 }
      );
    }

    // TODO: Send notification to owner about confirmed booking
    // This could be an email, push notification, or in-app notification
    console.log(`Booking ${bookingId} confirmed! Notify owner: ${booking.listings.profiles.email}`);

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        start_date: booking.start_date,
        end_date: booking.end_date,
        listing_title: booking.listings.title,
      },
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}