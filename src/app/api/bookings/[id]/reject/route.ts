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
import { unifiedEmailService } from '@/lib/email/unified-email-service';

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
      .from('app_notifications')
      .insert(notificationData.map(data => ({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        action_url: `/bookings/${bookingId}`,
        data: data.metadata,
        priority: 7, // High priority for booking rejections
      })));

    // Send notifications about booking rejection
    try {
      const { FCMBookingNotifications } = await import('@/lib/fcm/notifications');
      
      // Send FCM push notification to renter
      await FCMBookingNotifications.notifyRenterBookingRejected(
        booking.renter_id,
        bookingId,
        booking.listings.title,
        reason
      );

      // Send email notification to renter about rejection
      if (booking.profiles?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
        
        await unifiedEmailService.sendEmail({
          to: booking.profiles.email,
          subject: `❌ Booking Request Declined - ${booking.listings.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Booking Request Declined</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
                    .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #6b7280; }
                    .booking-details { background: #f9fafb; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
                    .button { display: inline-block; background: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
                    .reason-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    .refund-info { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    h1, h2, h3 { color: #111827; }
                    ul { padding-left: 20px; }
                    li { margin: 8px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>❌ Booking Request Declined</h1>
                        <p>Unfortunately, your booking request was not approved</p>
                    </div>
                    
                    <div class="content">
                        <p>Hi ${booking.profiles.name},</p>
                        
                        <p>We're sorry to inform you that your booking request has been declined by the host.</p>
                        
                        <div class="booking-details">
                            <h3>${booking.listings.title}</h3>
                            <p><strong>Requested Dates:</strong></p>
                            <p>📅 <strong>Start:</strong> ${new Date(booking.start_date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p>📅 <strong>End:</strong> ${new Date(booking.end_date).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Booking ID:</strong> ${bookingId}</p>
                        </div>

                        <div class="reason-box">
                            <h4>Reason for Decline:</h4>
                            <p>${reason}</p>
                        </div>

                        <div class="refund-info">
                            <h4>💰 Refund Information</h4>
                            <ul>
                                <li>✅ Your payment authorization has been cancelled</li>
                                <li>✅ No charges were made to your payment method</li>
                                ${booking.points_used > 0 ? `<li>✅ ${booking.points_used} points have been restored to your account</li>` : ''}
                                <li>✅ You can book other items immediately</li>
                            </ul>
                        </div>

                        <h3>What's Next?</h3>
                        <ul>
                            <li>🔍 Browse other similar items that might be available</li>
                            <li>📅 Try different dates for this item if it becomes available</li>
                            <li>💬 Contact the host directly if you have questions</li>
                            <li>⭐ Leave feedback to help improve the platform</li>
                        </ul>

                        <p style="text-align: center;">
                            <a href="${baseUrl}/search" class="button">
                                Browse Other Items
                            </a>
                        </p>

                        <p>Don't be discouraged! There are many other great items available on our platform. Keep exploring and you'll find the perfect rental for your needs.</p>
                    </div>
                    
                    <div class="footer">
                        <p>Need help finding alternatives? Contact us at <a href="mailto:support@rentitforward.com.au" style="color: #44D62C;">support@rentitforward.com.au</a></p>
                        <p>© 2024 Rent It Forward - Sustainable Sharing Platform</p>
                    </div>
                </div>
            </body>
            </html>
          `,
          replyTo: 'support@rentitforward.com.au',
        });
      }
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