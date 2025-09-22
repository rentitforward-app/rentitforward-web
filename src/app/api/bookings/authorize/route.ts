/**
 * POST /api/bookings/authorize
 * 
 * Step 1 of owner approval workflow:
 * - Create booking request with PENDING status
 * - Authorize payment (don't capture yet)
 * - Set tentative hold on dates
 * - Notify owner of approval request
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { 
  authorizePayment, 
  ensureStripeCustomer,
  PaymentAuthorizationData,
  generatePaymentBreakdown 
} from '@/lib/stripe/payment-authorization';
import { PRICING_CONSTANTS } from '@/lib/pricing-constants';
import { addHours, addDays } from 'date-fns';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

// Validation schema for booking authorization
const bookingAuthorizationSchema = z.object({
  listingId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyRate: z.number().positive(),
  duration: z.number().int().positive(),
  includeInsurance: z.boolean().default(false),
  securityDeposit: z.number().min(0).default(0),
  pointsToUse: z.number().min(0).default(0),
  paymentMethodId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = bookingAuthorizationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const bookingData = validation.data;

    // Get user profile for payment processing
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, points_balance, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify listing exists and is available
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, title, owner_id, daily_rate, security_deposit, status')
      .eq('id', bookingData.listingId)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found or not available' },
        { status: 404 }
      );
    }

    // Prevent self-booking
    if (listing.owner_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot book your own listing' },
        { status: 400 }
      );
    }

    // Check date availability (prevent race conditions with tentative holds)
    const { data: conflictingBookings } = await supabase
      .from('listing_availability')
      .select('date, status, booking_id')
      .eq('listing_id', bookingData.listingId)
      .gte('date', bookingData.startDate)
      .lt('date', bookingData.endDate)
      .in('status', ['booked', 'tentative']);

    if (conflictingBookings && conflictingBookings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Selected dates are no longer available',
          conflictingDates: conflictingBookings 
        },
        { status: 409 }
      );
    }

    // Calculate pricing breakdown
    const rentalFee = bookingData.dailyRate * bookingData.duration;
    const serviceFee = rentalFee * PRICING_CONSTANTS.SERVICE_FEE_PERCENTAGE;
    const insuranceFee = bookingData.includeInsurance 
      ? rentalFee * PRICING_CONSTANTS.INSURANCE_PERCENTAGE 
      : 0;
    
    // Calculate points credit (max available points up to requested amount)
    const maxPointsUsable = Math.min(bookingData.pointsToUse, profile.points_balance);
    const creditApplied = maxPointsUsable * PRICING_CONSTANTS.POINTS_TO_DOLLAR_RATE;
    
    const subtotal = rentalFee + serviceFee + insuranceFee + bookingData.securityDeposit;
    const totalAmount = Math.max(0, subtotal - creditApplied);

    // Ensure Stripe customer exists
    const customerResult = await ensureStripeCustomer(
      user.id,
      profile.email,
      profile.name
    );

    if (!customerResult.success) {
      return NextResponse.json(
        { error: 'Failed to process payment setup', details: customerResult.error },
        { status: 500 }
      );
    }

    // Create booking record with PENDING status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        renter_id: user.id,
        listing_id: bookingData.listingId,
        owner_id: listing.owner_id,
        start_date: bookingData.startDate,
        end_date: bookingData.endDate,
        duration: bookingData.duration,
        daily_rate: bookingData.dailyRate,
        rental_fee: rentalFee,
        service_fee: serviceFee,
        insurance_fee: insuranceFee,
        security_deposit: bookingData.securityDeposit,
        points_used: maxPointsUsable,
        credit_applied: creditApplied,
        total_amount: totalAmount,
        status: 'pending',
        tentative_hold: true,
        hold_expires_at: addHours(new Date(), 24), // 24 hour hold
        approval_deadline: addHours(new Date(), 48), // 48 hour approval deadline
        notes: bookingData.notes,
        stripe_customer_id: customerResult.customerId,
        include_insurance: bookingData.includeInsurance,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Failed to create booking request', details: bookingError },
        { status: 500 }
      );
    }

    // Authorize payment (don't capture yet)
    const authData: PaymentAuthorizationData = {
      listingId: bookingData.listingId,
      bookingId: booking.id,
      rentalFee,
      serviceFee,
      insuranceFee,
      securityDeposit: bookingData.securityDeposit,
      totalAmount,
      duration: bookingData.duration,
      startDate: bookingData.startDate,
      endDate: bookingData.endDate,
      pointsUsed: maxPointsUsable,
      creditApplied,
    };

    const authResult = await authorizePayment(
      customerResult.customerId!,
      authData,
      bookingData.paymentMethodId
    );

    if (!authResult.success) {
      // Clean up booking if payment authorization fails
      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      return NextResponse.json(
        { error: 'Payment authorization failed', details: authResult.error },
        { status: 402 }
      );
    }

    // Update booking with payment intent ID
    await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: authResult.paymentIntentId,
        status: 'pending_payment',
      })
      .eq('id', booking.id);

    // Create tentative holds on availability
    const dateRange = [];
    let currentDate = new Date(bookingData.startDate);
    const endDate = new Date(bookingData.endDate);

    while (currentDate < endDate) {
      dateRange.push({
        listing_id: bookingData.listingId,
        date: currentDate.toISOString().split('T')[0],
        status: 'tentative',
        booking_id: booking.id,
        blocked_reason: 'Pending approval',
      });
      currentDate = addDays(currentDate, 1);
    }

    if (dateRange.length > 0) {
      await supabase
        .from('listing_availability')
        .insert(dateRange);
    }

    // Deduct points from user balance (will be restored if booking is rejected)
    if (maxPointsUsable > 0) {
      await supabase
        .from('profiles')
        .update({
          points_balance: profile.points_balance - maxPointsUsable,
        })
        .eq('id', user.id);
    }

    // Generate payment breakdown for response
    const paymentBreakdown = generatePaymentBreakdown(authData);

    // Send notifications to owner about new booking request
    try {
      // Send FCM push notification and create in-app notification
      const { fcmAdminService, buildFCMMessage } = await import('@/lib/fcm/admin');
      
      const fcmTitle = '📋 New Booking Request';
      const fcmBody = `${profile.name} wants to rent your ${listing.title}`;
      const fcmData = { 
        type: 'booking_request', 
        booking_id: booking.id, 
        action_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au'}/bookings/${booking.id}` 
      };
      
      await fcmAdminService.sendToUser(listing.owner_id, fcmTitle, fcmBody, fcmData);
      
      // Create in-app notification
      await supabase.from('app_notifications').insert({
        user_id: listing.owner_id,
        type: 'booking_request',
        title: fcmTitle,
        message: fcmBody,
        action_url: fcmData.action_url,
        data: fcmData,
        priority: 8,
      });

      // Get owner profile for email notification
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', listing.owner_id)
        .single();

      if (ownerProfile) {
        // Send email notification to owner about booking request
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
        
        await unifiedEmailService.sendEmail({
          to: ownerProfile.email,
          subject: `📋 New Booking Request - ${listing.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>New Booking Request</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #44D62C 0%, #3AB827 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
                    .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #6b7280; }
                    .booking-details { background: #f9fafb; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #44D62C; }
                    .button { display: inline-block; background: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
                    .urgent { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    h1, h2, h3 { color: #111827; }
                    ul { padding-left: 20px; }
                    li { margin: 8px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📋 New Booking Request!</h1>
                        <p>You have a new booking request that needs your approval</p>
                    </div>
                    
                    <div class="content">
                        <p>Hi ${ownerProfile.full_name},</p>
                        
                        <p>Great news! Someone wants to book your listing and is waiting for your approval.</p>
                        
                        <div class="booking-details">
                            <h3>${listing.title}</h3>
                            <p><strong>Requested by:</strong> ${profile.name}</p>
                            <p><strong>Rental Period:</strong></p>
                            <p>📅 <strong>Start:</strong> ${new Date(bookingData.startDate).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p>📅 <strong>End:</strong> ${new Date(bookingData.endDate).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Duration:</strong> ${bookingData.duration} day${bookingData.duration !== 1 ? 's' : ''}</p>
                            <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)} AUD</p>
                            <p><strong>Booking ID:</strong> ${booking.id}</p>
                        </div>

                        ${bookingData.notes ? `
                        <h3>Message from Renter</h3>
                        <div class="booking-details">
                            <p>${bookingData.notes}</p>
                        </div>
                        ` : ''}

                        <div class="urgent">
                            <h4>⏰ Action Required Within 48 Hours</h4>
                            <p>This booking request will expire automatically if not approved within 48 hours. The renter's payment is authorized and ready to be captured once you approve.</p>
                        </div>

                        <h3>What You Need to Do:</h3>
                        <ul>
                            <li>🔍 Review the booking details and renter profile</li>
                            <li>✅ Approve the booking to confirm the rental</li>
                            <li>❌ Reject if dates don't work or you have concerns</li>
                            <li>💬 Message the renter to coordinate pickup details</li>
                        </ul>

                        <p style="text-align: center;">
                            <a href="${baseUrl}/dashboard/bookings/${booking.id}" class="button">
                                Review & Approve Booking
                            </a>
                        </p>

                        <h3>Payment Protection</h3>
                        <ul>
                            <li>✅ Payment is authorized and held securely</li>
                            <li>✅ Funds will be released to you after successful rental completion</li>
                            <li>✅ Platform commission is automatically handled</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>Need help? Contact us at <a href="mailto:support@rentitforward.com.au" style="color: #44D62C;">support@rentitforward.com.au</a></p>
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
      console.error('Failed to send owner notification:', notificationError);
      // Don't fail the booking if notification fails
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: 'pending_payment',
        listingTitle: listing.title,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        duration: bookingData.duration,
        totalAmount,
        paymentIntentId: authResult.paymentIntentId,
        clientSecret: authResult.clientSecret,
        expiresAt: booking.approval_deadline,
      },
      pricing: paymentBreakdown,
      message: 'Booking request created. Payment authorized pending owner approval.',
    });

  } catch (error) {
    console.error('Booking authorization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}