// @ts-nocheck - Temporary TypeScript disable during refactoring
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { Database } from '@/lib/supabase/types';
import { 
  calculatePaymentBreakdown, 
  createPaymentBreakdownRecord,
  calculateStripeAmounts,
  validatePaymentBreakdown 
} from '@/lib/payment-calculations';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');
  const type = searchParams.get('type'); // 'renter' or 'owner'

  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('bookings')
      .select(`
        *,
        listings (
          title,
          images,
          category,
          price_per_day
        ),
        profiles:renter_id (
          full_name,
          avatar_url
        ),
        owner_profile:owner_id (
          full_name,
          avatar_url
        )
      `);

    // Filter by user type
    if (type === 'renter') {
      query = query.eq('renter_id', user.id as string);
    } else if (type === 'owner') {
      query = query.eq('owner_id', user.id as string);
    } else {
      // Show both renter and owner bookings
      query = query.or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (error) {
    console.error('Error in bookings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingData = await request.json();

    // Validate required fields
    const requiredFields = ['listing_id', 'start_date', 'end_date', 'delivery_method'];
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', bookingData.listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if user is trying to book their own listing
    if (listing.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot book your own listing' }, { status: 400 });
    }

    // Check if renter has completed identity verification
    const { data: renterProfile, error: renterProfileError } = await supabase
      .from('profiles')
      .select('identity_verified, identity_verified_at')
      .eq('id', user.id)
      .single();

    if (renterProfileError || !renterProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!renterProfile.identity_verified) {
      return NextResponse.json({ 
        error: 'Identity verification required',
        code: 'IDENTITY_VERIFICATION_REQUIRED',
        message: 'You must complete identity verification before renting items. Please visit your settings to verify your identity.'
      }, { status: 403 });
    }

    // Calculate dates and pricing
    const startDate = new Date(bookingData.start_date);
    const endDate = new Date(bookingData.end_date);
    // Inclusive total days (pickup morning of start, return night of end)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    // Get user points for potential redemption
    const { data: userPoints } = await supabase
      .from('user_points')
      .select('available_points')
      .eq('user_id', user.id)
      .single();

    // Check if this is user's first rental
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('renter_id', user.id)
      .eq('status', 'completed');

    const isFirstRental = !existingBookings || existingBookings.length === 0;

    // Calculate comprehensive payment breakdown using new system
    const deliveryFee = bookingData.delivery_method === 'delivery' ? (bookingData.delivery_fee || 20) : 0;
    
    const paymentBreakdown = calculatePaymentBreakdown({
      basePricePerDay: listing.price_per_day,
      totalDays,
      includeInsurance: bookingData.include_insurance || false,
      insuranceFeePerDay: 7, // $7/day as per pricing doc
      deliveryFee,
      securityDeposit: listing.deposit || 0,
      pointsToRedeem: bookingData.points_to_redeem || 0,
      isFirstRental,
      currency: 'AUD'
    });

    // Validate the calculation
    const validation = validatePaymentBreakdown(paymentBreakdown);
    if (!validation.isValid) {
      console.error('Payment calculation validation failed:', validation.errors);
      return NextResponse.json({ 
        error: 'Payment calculation error', 
        details: validation.errors 
      }, { status: 500 });
    }

    // Create booking record with comprehensive payment data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        listing_id: bookingData.listing_id,
        renter_id: user.id as string,
        owner_id: listing.owner_id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        total_days: totalDays,
        price_per_day: listing.price_per_day,
        subtotal: paymentBreakdown.subtotal,
        service_fee: paymentBreakdown.renterServiceFeeAmount,
        delivery_fee: paymentBreakdown.deliveryFee,
        total_amount: paymentBreakdown.renterTotalAmount,
        deposit_amount: paymentBreakdown.securityDeposit,
        status: 'pending',
        delivery_method: bookingData.delivery_method,
        delivery_address: bookingData.delivery_address || null,
        pickup_address: bookingData.pickup_location || null,
        special_instructions: bookingData.pickup_instructions || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // Create detailed payment breakdown record
    const paymentBreakdownRecord = createPaymentBreakdownRecord(booking.id, paymentBreakdown);
    const { error: breakdownError } = await supabase
      .from('payment_breakdowns')
      .insert(paymentBreakdownRecord);

    if (breakdownError) {
      console.error('Error creating payment breakdown:', breakdownError);
      // Don't fail the booking, but log the error
    }

    // Handle points redemption if applicable
    if (bookingData.points_to_redeem > 0 && userPoints?.available_points >= bookingData.points_to_redeem) {
      // Update user points
      await supabase
        .from('user_points')
        .update({ 
          available_points: userPoints.available_points - bookingData.points_to_redeem,
          lifetime_redeemed: (userPoints.lifetime_redeemed || 0) + bookingData.points_to_redeem
        })
        .eq('user_id', user.id);

      // Record points transaction
      await supabase
        .from('points_transactions')
        .insert({
          user_id: user.id,
          booking_id: booking.id,
          transaction_type: 'redeemed_booking',
          points_amount: -bookingData.points_to_redeem,
          description: `Redeemed ${bookingData.points_to_redeem} points for booking`,
          reference_id: booking.id,
          reference_type: 'booking'
        });
    }

    // Get owner's Stripe account for Connect payments
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', listing.owner_id)
      .single();

    if (!ownerProfile?.stripe_onboarding_complete) {
      return NextResponse.json({ 
        error: 'Owner payment setup incomplete. Please contact the owner.' 
      }, { status: 400 });
    }

    // Create Stripe payment intent with Connect using new calculation system
    try {
      const stripeAmounts = calculateStripeAmounts(paymentBreakdown);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: stripeAmounts.totalAmountCents,
        currency: 'aud',
        application_fee_amount: stripeAmounts.platformFeeCents,
        transfer_data: {
          destination: ownerProfile.stripe_account_id,
        },
        metadata: {
          booking_id: booking.id,
          listing_id: listing.id,
          renter_id: user.id,
          owner_id: listing.owner_id,
          subtotal: paymentBreakdown.subtotal.toString(),
          renter_service_fee: paymentBreakdown.renterServiceFeeAmount.toString(),
          owner_commission: paymentBreakdown.ownerCommissionAmount.toString(),
          owner_net_earnings: paymentBreakdown.ownerNetEarnings.toString(),
          platform_revenue: paymentBreakdown.platformTotalRevenue.toString(),
          insurance_fee: paymentBreakdown.insuranceFee.toString(),
          deposit_amount: paymentBreakdown.securityDeposit.toString(),
          points_redeemed: paymentBreakdown.pointsRedeemed.toString(),
          points_credit_applied: paymentBreakdown.pointsCreditApplied.toString(),
          calculation_version: paymentBreakdown.calculationVersion,
        },
        description: `Rent It Forward: ${listing.title} (${totalDays} days)`,
        on_behalf_of: ownerProfile.stripe_account_id,
      });

      // Update booking with payment intent ID
      await supabase
        .from('bookings')
        .update({ 
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'pending'
        } as any)
        .eq('id', booking.id);

      // Create payment transaction records
      const paymentTransactions = [
        {
          booking_id: booking.id,
          payment_breakdown_id: paymentBreakdownRecord.booking_id, // This will be the ID from the inserted record
          transaction_type: 'renter_payment',
          amount: paymentBreakdown.renterTotalAmount,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'pending',
          description: `Renter payment for ${listing.title}`,
          metadata: {
            includes_insurance: paymentBreakdown.insuranceFee > 0,
            includes_deposit: paymentBreakdown.securityDeposit > 0,
            points_credit_applied: paymentBreakdown.pointsCreditApplied
          }
        }
      ];

      // Add separate transaction for deposit if applicable
      if (paymentBreakdown.securityDeposit > 0) {
        paymentTransactions.push({
          booking_id: booking.id,
          payment_breakdown_id: paymentBreakdownRecord.booking_id,
          transaction_type: 'deposit_hold',
          amount: paymentBreakdown.securityDeposit,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'pending',
          description: `Security deposit hold for ${listing.title}`,
          metadata: { deposit_type: 'security' }
        });
      }

      await supabase
        .from('payment_transactions')
        .insert(paymentTransactions);

      return NextResponse.json({
        booking: { 
          ...booking, 
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'pending'
        },
        payment_breakdown: paymentBreakdown,
        client_secret: paymentIntent.client_secret,
        requires_connect: true,
        stripe_account_id: ownerProfile.stripe_account_id,
      }, { status: 201 });
    } catch (stripeError) {
      console.error('Error creating payment intent:', stripeError);
      
      // Delete the booking if payment intent creation fails
      await supabase.from('bookings').delete().eq('id', booking.id);
      
      return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in create booking API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 