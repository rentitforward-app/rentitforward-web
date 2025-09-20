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
      const { FCMBookingNotifications } = await import('@/lib/fcm/notifications');
      await FCMBookingNotifications.notifyOwnerBookingRequest(
        listing.owner_id,
        booking.id,
        listing.title,
        profile.name
      );
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