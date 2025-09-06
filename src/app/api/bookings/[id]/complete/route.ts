import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePointsForAction } from '@/lib/payment-calculations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: bookingId } = resolvedParams;
    const { userId, ownerConfirmation = false, autoRelease = false } = await request.json();

    if (!bookingId || !userId) {
      return NextResponse.json(
        { error: 'Booking ID and User ID are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch booking details to verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!listing_id (
          id,
          title
        )
      `)
      .eq('id', bookingId)
      .in('status', ['in_progress', 'return_pending']) // Can complete in-progress or return_pending rentals
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: `Booking not found or not eligible for completion. Current status must be 'in_progress' or 'return_pending'.` },
        { status: 404 }
      );
    }

    // Verify that the user is the owner of the listing
    if (booking.owner_id !== userId) {
      return NextResponse.json(
        { error: 'Only the listing owner can mark a rental as completed' },
        { status: 403 }
      );
    }

    // Update booking status to completed
    const updateData = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      owner_confirmed_return: ownerConfirmation,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError || !updatedBooking) {
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      );
    }

    // Create notifications for both owner and renter
    const notifications = [
      {
        user_id: booking.owner_id,
        type: 'rental_completed',
        title: 'Rental Completed',
        message: `You've marked the rental as completed. ${autoRelease ? 'Funds will be automatically released.' : 'Funds are pending admin review for release.'}`,
        data: {
          booking_id: bookingId,
          listing_title: booking.listings?.title,
          auto_release: autoRelease,
        },
        created_at: new Date().toISOString(),
      },
      {
        user_id: booking.renter_id,
        type: 'rental_completed',
        title: 'Rental Completed',
        message: `The owner has confirmed that your rental of "${booking.listings?.title}" has been completed successfully.`,
        data: {
          booking_id: bookingId,
          listing_title: booking.listings?.title,
        },
        created_at: new Date().toISOString(),
      },
    ];

    // Insert notifications
    for (const notification of notifications) {
      try {
        await supabase.from('notifications').insert(notification);
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    // Award points for first rental completion
    try {
      // Check if this is the renter's first completed rental
      const { data: completedBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('renter_id', booking.renter_id)
        .eq('status', 'completed');

      const isFirstRental = completedBookings && completedBookings.length === 1; // This booking is the first

      if (isFirstRental) {
        const pointsToAward = calculatePointsForAction('first_rental');
        
        // Get or create user points record
        const { data: existingPoints } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', booking.renter_id)
          .single();

        if (existingPoints) {
          // Update existing points
          await supabase
            .from('user_points')
            .update({
              total_points: existingPoints.total_points + pointsToAward,
              available_points: existingPoints.available_points + pointsToAward,
              lifetime_earned: existingPoints.lifetime_earned + pointsToAward,
              last_activity_at: new Date().toISOString()
            })
            .eq('user_id', booking.renter_id);
        } else {
          // Create new points record
          await supabase
            .from('user_points')
            .insert({
              user_id: booking.renter_id,
              total_points: pointsToAward,
              available_points: pointsToAward,
              lifetime_earned: pointsToAward
            });
        }

        // Record points transaction
        await supabase
          .from('points_transactions')
          .insert({
            user_id: booking.renter_id,
            booking_id: bookingId,
            transaction_type: 'earned_first_rental',
            points_amount: pointsToAward,
            description: `Earned ${pointsToAward} points for completing your first rental`,
            reference_id: bookingId,
            reference_type: 'booking'
          });

        // Add points notification
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.renter_id,
            type: 'points_earned',
            title: 'Points Earned!',
            message: `Congratulations! You've earned ${pointsToAward} points (${(pointsToAward / 10).toFixed(2)} AUD credit) for completing your first rental.`,
            data: {
              points_earned: pointsToAward,
              credit_value: pointsToAward / 10,
              reason: 'first_rental',
              booking_id: bookingId
            }
          });
      }
    } catch (pointsError) {
      console.error('Error awarding points:', pointsError);
      // Don't fail the completion if points awarding fails
    }

    // If auto-release is enabled, immediately trigger fund release
    if (autoRelease) {
      try {
        const releaseResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/release-funds/${bookingId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adminUserId: 'system', // Mark as system-triggered
            releaseType: 'automatic',
          }),
        });

        if (!releaseResponse.ok) {
          console.error('Auto-release failed:', await releaseResponse.text());
          // Don't fail the completion, just log the error
        } else {
          console.log(`Auto-released funds for booking ${bookingId}`);
        }
      } catch (releaseError) {
        console.error('Error during auto-release:', releaseError);
        // Don't fail the completion if auto-release fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      auto_release_attempted: autoRelease,
      message: autoRelease 
        ? 'Rental completed and funds release initiated'
        : 'Rental completed, funds pending admin release'
    });

  } catch (error) {
    console.error('Error completing rental:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete rental',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
