import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/[id]/cancel
 * Cancel a booking (only allowed for payment_required bookings)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id: bookingId } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the booking to verify ownership and status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, renter_id, owner_id, status, listing_id, start_date, end_date')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is the renter or owner
    if (booking.renter_id !== user.id && booking.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Only allow cancellation for specific statuses
    const cancellableStatuses = ['pending', 'payment_required'];
    if (!cancellableStatuses.includes(booking.status)) {
      return NextResponse.json(
        { 
          error: `Cannot cancel booking with status '${booking.status}'. Only bookings with status '${cancellableStatuses.join("' or '")}' can be cancelled.` 
        },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

          // Create notifications for both parties
      const isRenterCancelling = booking.renter_id === user.id;
      const otherPartyId = isRenterCancelling ? booking.owner_id : booking.renter_id;
      
      const notifications = [
        // Notification for the person who cancelled
        {
          user_id: user.id,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `You have successfully cancelled the booking${booking.start_date ? ` for ${booking.start_date} to ${booking.end_date}` : ''}.`,
          data: {
            booking_id: bookingId,
            action: 'self_cancelled'
          },
          created_at: new Date().toISOString(),
        },
        // Notification for the other party
        {
          user_id: otherPartyId,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `A booking${booking.start_date ? ` for ${booking.start_date} to ${booking.end_date}` : ''} has been cancelled by the ${isRenterCancelling ? 'renter' : 'owner'}.`,
          data: {
            booking_id: bookingId,
            cancelled_by: isRenterCancelling ? 'renter' : 'owner'
          },
          created_at: new Date().toISOString(),
        },
      ];

    // Insert notifications (don't fail the API if notifications fail)
    for (const notification of notifications) {
      try {
        await supabase.from('notifications').insert(notification);
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking_id: bookingId
    });

  } catch (error) {
    console.error('Booking cancellation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
