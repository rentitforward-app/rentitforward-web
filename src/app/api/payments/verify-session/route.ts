import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, bookingId } = await request.json();

    if (!sessionId || !bookingId) {
      return NextResponse.json(
        { error: 'Session ID and Booking ID are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Verify that this session belongs to the booking
    const sessionBookingId = session.metadata?.bookingId;
    if (sessionBookingId !== bookingId) {
      return NextResponse.json(
        { error: 'Session does not match booking' },
        { status: 400 }
      );
    }

    // Get the payment intent to extract payment details
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);

    // Update booking status to confirmed and mark payment as successful
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'succeeded',
        stripe_payment_intent_id: paymentIntent.id,
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('status', 'payment_required')
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      );
    }

    if (!updatedBooking) {
      return NextResponse.json(
        { error: 'Booking not found or already processed' },
        { status: 404 }
      );
    }

    // Create a notification for the owner
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: updatedBooking.owner_id,
          type: 'booking_paid',
          title: 'Payment Received',
          message: `Payment received for your rental booking. The rental is now confirmed!`,
          data: {
            booking_id: bookingId,
            amount: paymentIntent.amount_received / 100, // Convert from cents
            currency: paymentIntent.currency?.toUpperCase() || 'AUD',
          },
          created_at: new Date().toISOString(),
        });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      paymentDetails: {
        amount: paymentIntent.amount_received / 100,
        currency: paymentIntent.currency?.toUpperCase() || 'AUD',
        paymentMethod: paymentIntent.payment_method_types[0],
      },
    });

  } catch (error) {
    console.error('Error verifying payment session:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment session' },
      { status: 500 }
    );
  }
} 