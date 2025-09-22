import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
// Define booking enums locally since shared package import is failing
const BookingStatus = {
  PENDING: 'pending',
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded'
} as const;

const BookingCancellationReason = {
  USER_REQUESTED: 'user_requested',
  OWNER_CANCELLED: 'owner_cancelled',
  ITEM_UNAVAILABLE: 'item_unavailable',
  PAYMENT_FAILED: 'payment_failed',
  POLICY_VIOLATION: 'policy_violation',
  DAMAGE_REPORTED: 'damage_reported',
  OTHER: 'other'
} as const;

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reason, note } = await request.json();
    
    // Await params to fix Next.js warning
    const { id } = await params;
    
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!listing_id (
          id,
          title,
          price_per_day
        ),
        profiles!owner_id (
          id,
          full_name,
          email
        ),
        renter:profiles!renter_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user can cancel this booking
    const isRenter = booking.renter_id === user.id;
    const isOwner = booking.owner_id === user.id;
    
    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized to cancel this booking' }, { status: 403 });
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json({ error: 'Booking cannot be cancelled' }, { status: 400 });
    }

    // Calculate cancellation fee based on timing
    const startDate = new Date(booking.start_date);
    const now = new Date();
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let cancellationFee = 0;
    let refundAmount = booking.total_amount;
    
    // If less than 24 hours before pickup, charge 50% cancellation fee
    if (hoursUntilStart < 24) {
      cancellationFee = booking.total_amount * 0.5;
      refundAmount = booking.total_amount - cancellationFee;
    }

    // Process Stripe refund if payment was made
    let stripeRefundId = null;
    if (booking.stripe_payment_intent_id && booking.payment_status === 'succeeded') {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            booking_id: booking.id,
            cancellation_reason: reason,
            cancellation_fee: cancellationFee.toString(),
            refund_amount: refundAmount.toString()
          }
        });
        stripeRefundId = refund.id;
      } catch (stripeError) {
        console.error('Stripe refund failed:', stripeError);
        return NextResponse.json(
          { error: 'Failed to process refund. Please contact support.' },
          { status: 500 }
        );
      }
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || BookingCancellationReason.USER_REQUESTED,
        cancellation_note: note || null,
        cancellation_fee: cancellationFee,
        refund_amount: refundAmount,
        payment_status: stripeRefundId ? 'refunded' : booking.payment_status
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    // Send cancellation emails
    try {
      await sendCancellationEmails(booking, isRenter, cancellationFee, refundAmount);
    } catch (emailError) {
      console.error('Failed to send cancellation emails:', emailError);
      // Don't fail the cancellation if email fails
    }

    // If there's a refund, process it
    if (refundAmount > 0) {
      try {
        await processRefund(booking, refundAmount);
      } catch (refundError) {
        console.error('Failed to process refund:', refundError);
        // Log error but don't fail the cancellation
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Booking cancelled successfully',
      cancellationFee,
      refundAmount
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendCancellationEmails(booking: any, isRenter: boolean, cancellationFee: number, refundAmount: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
  
  const cancelledByName = isRenter ? booking.profiles.full_name : booking.renter.full_name;
  const otherPartyName = isRenter ? booking.renter.full_name : booking.profiles.full_name;
  
  const emailData = {
    booking_id: booking.id,
    listing_title: booking.listings.title,
    start_date: booking.start_date,
    end_date: booking.end_date,
    total_amount: booking.total_amount,
    renter_name: booking.profiles.full_name,
    renter_email: booking.profiles.email,
    owner_name: booking.renter.full_name,
    owner_email: booking.renter.email,
    listing_location: 'Location TBD',
    base_url: baseUrl,
    cancellation_fee: cancellationFee,
    refund_amount: refundAmount,
    cancellation_reason: `Cancelled by ${isRenter ? 'renter' : 'owner'}`,
  };

  // Send email to the person who cancelled
  const cancellerEmail = isRenter ? booking.profiles.email : booking.renter.email;
  if (cancellerEmail) {
    await unifiedEmailService.sendBookingCancellationEmail(
      emailData,
      !isRenter, // isOwner - opposite of isRenter for the canceller
      !isRenter  // cancelledByOwner
    );
  }

  // Send email to the other party
  const otherPartyEmail = isRenter ? booking.renter.email : booking.profiles.email;
  if (otherPartyEmail) {
    await unifiedEmailService.sendBookingCancellationEmail(
      emailData,
      isRenter, // isOwner - same as isRenter for the other party
      !isRenter // cancelledByOwner
    );
  }
}

async function processRefund(booking: any, refundAmount: number) {
  // This would integrate with your payment processor (Stripe)
  // For now, we'll just log the refund amount
  console.log(`Processing refund of $${refundAmount} for booking ${booking.id}`);
  
  // TODO: Implement actual refund processing with Stripe
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // await stripe.refunds.create({
  //   payment_intent: booking.payment_intent_id,
  //   amount: Math.round(refundAmount * 100), // Convert to cents
  //   reason: 'requested_by_customer'
  // });
}