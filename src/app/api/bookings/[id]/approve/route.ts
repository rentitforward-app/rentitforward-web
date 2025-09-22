/**
 * POST /api/bookings/[id]/approve
 * 
 * Step 2a of owner approval workflow:
 * - Verify owner has permission to approve
 * - Capture authorized payment
 * - Update booking status to CONFIRMED
 * - Convert tentative holds to booked
 * - Send confirmation notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { captureAuthorizedPayment } from '@/lib/stripe/payment-authorization';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

const approvalSchema = z.object({
  notes: z.string().max(500).optional(),
  autoApproveTimeframe: z.number().optional(), // Future feature: auto-approve window
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
    const validation = approvalSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid approval data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { notes } = validation.data;

    // Get booking details with listing info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!inner(id, title, owner_id),
        profiles!renter_id(id, name, email)
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
        { error: 'Only the listing owner can approve this booking' },
        { status: 403 }
      );
    }

    // Verify booking is in correct status for approval
    if (!['pending', 'pending_payment'].includes(booking.status)) {
      return NextResponse.json(
        { 
          error: `Cannot approve booking with status: ${booking.status}`,
          currentStatus: booking.status 
        },
        { status: 400 }
      );
    }

    // Check if approval deadline has passed
    if (new Date() > new Date(booking.approval_deadline)) {
      return NextResponse.json(
        { error: 'Approval deadline has passed' },
        { status: 410 }
      );
    }

    // Capture the authorized payment
    if (!booking.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'No payment authorization found for this booking' },
        { status: 400 }
      );
    }

    const captureResult = await captureAuthorizedPayment(
      booking.stripe_payment_intent_id
    );

    if (!captureResult.success) {
      return NextResponse.json(
        { 
          error: 'Failed to capture payment', 
          details: captureResult.error 
        },
        { status: 402 }
      );
    }

    // Update booking status to confirmed
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        owner_response_at: new Date().toISOString(),
        owner_approval_notes: notes,
        stripe_charge_id: captureResult.chargeId,
        payment_captured_at: new Date().toISOString(),
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

    // Convert tentative holds to confirmed bookings
    await supabase
      .from('listing_availability')
      .update({
        status: 'booked',
        blocked_reason: 'Confirmed booking',
      })
      .eq('booking_id', bookingId)
      .eq('status', 'tentative');

    // Create booking confirmation record for both parties
    const confirmationData = [
      {
        booking_id: bookingId,
        user_id: booking.renter_id,
        type: 'booking_confirmed',
        title: 'Booking Confirmed!',
        message: `Your booking for "${booking.listings.title}" has been approved by the owner.`,
        metadata: {
          listing_title: booking.listings.title,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount,
        },
      },
      {
        booking_id: bookingId,
        user_id: booking.listings.owner_id,
        type: 'booking_confirmed',
        title: 'Booking Approved',
        message: `You approved the booking for "${booking.listings.title}".`,
        metadata: {
          renter_name: booking.profiles.name,
          start_date: booking.start_date,
          end_date: booking.end_date,
          payout_amount: booking.rental_fee * 0.8, // After 20% commission
        },
      },
    ];

    await supabase
      .from('app_notifications')
      .insert(confirmationData.map(data => ({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        action_url: `/bookings/${bookingId}`,
        data: data.metadata,
        priority: 8, // High priority for booking confirmations
      })));

    // Send notifications about booking approval
    try {
      const { fcmAdminService } = await import('@/lib/fcm/admin');
      
      // Notify renter of approval (FCM + In-app)
      const fcmTitle = '✅ Booking Confirmed!';
      const fcmBody = `Your booking for "${booking.listings.title}" has been approved!`;
      const fcmData = { 
        type: 'booking_confirmed', 
        booking_id: bookingId, 
        action_url: `/bookings/${bookingId}` 
      };
      
      await fcmAdminService.sendToUser(booking.renter_id, fcmTitle, fcmBody, fcmData);

      // Notify renter about payment confirmation (FCM + In-app)
      const paymentTitle = '💳 Payment Confirmed!';
      const paymentBody = `Your payment of $${(captureResult.capturedAmount || booking.total_amount).toFixed(2)} for "${booking.listings.title}" has been processed`;
      const paymentData = { 
        type: 'payment_confirmed', 
        booking_id: bookingId, 
        action_url: `/bookings/${bookingId}` 
      };
      
      await fcmAdminService.sendToUser(booking.renter_id, paymentTitle, paymentBody, paymentData);

      // Notify owner about payment confirmation (FCM + In-app)
      const ownerPaymentBody = `Payment received for "${booking.listings.title}" booking`;
      await fcmAdminService.sendToUser(booking.listings.owner_id, paymentTitle, ownerPaymentBody, paymentData);

      // Send email notifications
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
      
      // Get owner profile for email
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', booking.listings.owner_id)
        .single();

      // Send booking confirmation emails to both parties
      if (booking.profiles?.email) {
        await unifiedEmailService.sendBookingConfirmationEmail({
          booking_id: bookingId,
          listing_title: booking.listings.title,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount,
          renter_name: booking.profiles.name,
          renter_email: booking.profiles.email,
          owner_name: ownerProfile?.full_name || 'Host',
          owner_email: ownerProfile?.email || '',
          listing_location: 'Location TBD', // Would need to get from listing
          pickup_location: booking.pickup_location,
          renter_message: booking.notes,
          base_url: baseUrl,
        }, false); // false = renter email
      }

      if (ownerProfile?.email) {
        await unifiedEmailService.sendBookingConfirmationEmail({
          booking_id: bookingId,
          listing_title: booking.listings.title,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount,
          renter_name: booking.profiles.name,
          renter_email: booking.profiles.email,
          owner_name: ownerProfile.full_name,
          owner_email: ownerProfile.email,
          listing_location: 'Location TBD', // Would need to get from listing
          pickup_location: booking.pickup_location,
          renter_message: booking.notes,
          base_url: baseUrl,
        }, true); // true = owner email
      }
      
    } catch (notificationError) {
      console.error('Failed to send approval notifications:', notificationError);
      // Don't fail the booking if notification fails
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        confirmedAt: updatedBooking.owner_response_at,
        chargeId: captureResult.chargeId,
        capturedAmount: captureResult.capturedAmount,
      },
      renterInfo: {
        name: booking.profiles.name,
        email: booking.profiles.email,
      },
      paymentInfo: {
        totalCaptured: captureResult.capturedAmount,
        ownerPayout: booking.rental_fee * 0.8,
        platformRevenue: booking.service_fee + (booking.rental_fee * 0.2),
      },
      message: 'Booking approved successfully! Payment has been captured.',
    });

  } catch (error) {
    console.error('Booking approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}