/**
 * POST /api/bookings/[id]/reject
 * 
 * Step 2b of owner approval workflow:
 * - Verify owner has permission to reject
 * - Void/cancel authorized payment
 * - Update booking status to REJECTED
 * - Release tentative holds
 * - Restore user points
 * - Send rejection notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { voidAuthorizedPayment } from '@/lib/stripe/payment-authorization';

const rejectionSchema = z.object({
  reason: z.string().min(10).max(500), // Require reason for rejection
  notes: z.string().max(500).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id: bookingId } = await params;
    
    // Get current user (should be the owner)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = rejectionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid rejection data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { reason, notes } = validation.data;

    // Get booking details with listing and renter info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!inner(id, title, owner_id),
        profiles!renter_id(id, name, email, points_balance)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify owner permission
    if (booking.listings.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the listing owner can reject this booking' },
        { status: 403 }
      );
    }

    // Verify booking is in correct status for rejection
    if (!['pending', 'pending_payment'].includes(booking.status)) {
      return NextResponse.json(
        { 
          error: `Cannot reject booking with status: ${booking.status}`,
          currentStatus: booking.status 
        },
        { status: 400 }
      );
    }

    // Void the authorized payment
    if (booking.stripe_payment_intent_id) {
      const voidResult = await voidAuthorizedPayment(
        booking.stripe_payment_intent_id,
        `Owner rejected booking: ${reason}`
      );

      if (!voidResult.success) {
        // Log error but don't fail the rejection
        console.error('Failed to void payment:', voidResult.error);
      }
    }

    // Update booking status to rejected
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'rejected',
        owner_response_at: new Date().toISOString(),
        rejection_reason: reason,
        owner_rejection_notes: notes,
        tentative_hold: false,
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update booking status', details: updateError },
        { status: 500 }
      );
    }

    // Release tentative holds on dates
    await supabase
      .from('listing_availability')
      .delete()
      .eq('booking_id', bookingId)
      .eq('status', 'tentative');

    // Restore user's points balance if points were used
    if (booking.points_used > 0) {
      await supabase
        .from('profiles')
        .update({
          points_balance: booking.profiles.points_balance + booking.points_used,
        })
        .eq('id', booking.renter_id);
    }

    // Create rejection notification records
    const notificationData = [
      {
        booking_id: bookingId,
        user_id: booking.renter_id,
        type: 'booking_rejected',
        title: 'Booking Request Declined',
        message: `Unfortunately, your booking request for "${booking.listings.title}" was declined by the owner.`,
        metadata: {
          listing_title: booking.listings.title,
          rejection_reason: reason,
          start_date: booking.start_date,
          end_date: booking.end_date,
          refund_amount: booking.total_amount,
          points_restored: booking.points_used,
        },
      },
      {
        booking_id: bookingId,
        user_id: booking.listings.owner_id,
        type: 'booking_rejected',
        title: 'Booking Request Declined',
        message: `You declined the booking request for "${booking.listings.title}".`,
        metadata: {
          renter_name: booking.profiles.name,
          rejection_reason: reason,
          start_date: booking.start_date,
          end_date: booking.end_date,
        },
      },
    ];

    await supabase
      .from('notification_history')
      .insert(notificationData);

    // Send notifications about booking rejection
    try {
      const { BookingNotifications } = await import('@/lib/onesignal/notifications');
      const { BookingNotifications: DatabaseNotifications } = await import('@/lib/notifications/database');
      
      // Send OneSignal push notification
      await BookingNotifications.notifyRenterBookingRejected(
        booking.renter_id,
        bookingId,
        booking.listings.title,
        reason
      );

      // Create database notification
      await DatabaseNotifications.createRenterBookingRejectedNotification(
        booking.renter_id,
        bookingId,
        booking.listings.title
      );
    } catch (notificationError) {
      console.error('Failed to send rejection notification:', notificationError);
      // Don't fail the booking if notification fails
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        rejectedAt: updatedBooking.owner_response_at,
        rejectionReason: reason,
      },
      renterInfo: {
        name: booking.profiles.name,
        email: booking.profiles.email,
        pointsRestored: booking.points_used,
      },
      refundInfo: {
        authorizedAmount: booking.total_amount,
        paymentVoided: booking.stripe_payment_intent_id ? true : false,
        pointsRestored: booking.points_used,
      },
      message: 'Booking rejected. Payment authorization has been cancelled and points restored to the renter.',
    });

  } catch (error) {
    console.error('Booking rejection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}