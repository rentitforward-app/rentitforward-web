import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendReviewEmail } from '@/lib/email-service';

export async function GET(request: NextRequest) {
  // Verify that this is being called by an authorized source
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET || 'dev-cron-secret';
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const now = new Date();
    
    // Find completed bookings from 7 days ago that don't have reviews yet
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const reminderThreshold = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    const cutoffDate = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 14 days ago (too late for reviews)

    console.log('Checking for review reminders...');
    console.log('Reminder threshold:', reminderThreshold.toISOString());
    console.log('Cutoff date:', cutoffDate.toISOString());

    // Get completed bookings that need review reminders
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        renter_id,
        owner_id,
        completed_at,
        end_date,
        listing:listing_id (
          id,
          title
        ),
        renter:renter_id (
          id,
          email,
          full_name
        ),
        owner:owner_id (
          id,
          email,
          full_name
        ),
        renter_reviews:reviews!reviews_booking_id_fkey (
          id,
          type
        ),
        owner_reviews:reviews!reviews_booking_id_fkey (
          id,
          type
        )
      `)
      .eq('status', 'completed')
      .gte('completed_at', cutoffDate.toISOString())
      .lte('completed_at', reminderThreshold.toISOString());

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings found for review reminders');
      return NextResponse.json({ message: 'No reminders to send', sent: 0 });
    }

    console.log(`Found ${bookings.length} completed bookings to check for review reminders`);

    let remindersSent = 0;
    const results = [];

    for (const booking of bookings) {
      try {
        const completedAt = new Date(booking.completed_at);
        const daysAgo = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = 14 - daysAgo;

        // Skip if outside reminder window
        if (daysRemaining <= 0 || daysRemaining > 7) {
          continue;
        }

        // Check if renter needs reminder (no renter_to_owner review exists)
        const hasRenterReview = booking.renter_reviews?.some((r: any) => r.type === 'renter_to_owner');
        if (!hasRenterReview && booking.renter?.email) {
          const result = await sendReviewReminderEmail({
            recipientEmail: booking.renter.email,
            recipientName: booking.renter.full_name || 'There',
            listingTitle: booking.listing?.title || 'your rental',
            otherPartyName: booking.owner?.full_name || 'the owner',
            reviewType: 'renter',
            daysRemaining,
            bookingId: booking.id,
          });

          results.push({
            bookingId: booking.id,
            type: 'renter_reminder',
            success: result.success,
            error: result.error,
          });

          if (result.success) {
            remindersSent++;
          }
        }

        // Check if owner needs reminder (no owner_to_renter review exists)
        const hasOwnerReview = booking.owner_reviews?.some((r: any) => r.type === 'owner_to_renter');
        if (!hasOwnerReview && booking.owner?.email) {
          const result = await sendReviewReminderEmail({
            recipientEmail: booking.owner.email,
            recipientName: booking.owner.full_name || 'There',
            listingTitle: booking.listing?.title || 'your rental',
            otherPartyName: booking.renter?.full_name || 'the renter',
            reviewType: 'owner',
            daysRemaining,
            bookingId: booking.id,
          });

          results.push({
            bookingId: booking.id,
            type: 'owner_reminder',
            success: result.success,
            error: result.error,
          });

          if (result.success) {
            remindersSent++;
          }
        }

        // Add a small delay to avoid overwhelming email providers
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        results.push({
          bookingId: booking.id,
          type: 'error',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Review reminder job completed. Sent ${remindersSent} reminders.`);

    return NextResponse.json({
      message: 'Review reminders processed',
      sent: remindersSent,
      bookingsChecked: bookings.length,
      results: results.length > 0 ? results : undefined,
    });

  } catch (error) {
    console.error('Error in review reminders cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Send a review reminder email
 */
async function sendReviewReminderEmail(data: {
  recipientEmail: string;
  recipientName: string;
  listingTitle: string;
  otherPartyName: string;
  reviewType: 'renter' | 'owner';
  daysRemaining: number;
  bookingId: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const templateData = {
      recipientName: data.recipientName,
      listingTitle: data.listingTitle,
      otherPartyName: data.otherPartyName,
      reviewType: data.reviewType,
      daysRemaining: data.daysRemaining,
      actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${data.bookingId}/reviews`,
    };

    const result = await sendReviewEmail('reminder', data.recipientEmail, templateData);
    
    if (result.success) {
      console.log(`Review reminder sent to ${data.recipientEmail} for booking ${data.bookingId}`);
    } else {
      console.error(`Failed to send reminder to ${data.recipientEmail}:`, result.error);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error sending review reminder email:`, errorMessage);
    return { success: false, error: errorMessage };
  }
} 