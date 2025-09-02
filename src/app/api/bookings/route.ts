// @ts-nocheck - Temporary TypeScript disable during refactoring
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { Database } from '@/lib/supabase/types';

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

    // Calculate pricing
    let subtotal = 0;
    if (totalDays >= 30 && listing.monthly_rate) {
      const months = Math.floor(totalDays / 30);
      const remainingDays = totalDays % 30;
      subtotal = (months * listing.monthly_rate) + (remainingDays * listing.price_per_day);
    } else if (totalDays >= 7 && listing.price_weekly) {
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;
      subtotal = (weeks * listing.price_weekly) + (remainingDays * listing.price_per_day);
    } else {
      subtotal = totalDays * listing.price_per_day;
    }

    const serviceFee = subtotal * 0.05; // 5% service fee
    const totalAmount = subtotal + serviceFee;

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        listing_id: bookingData.listing_id, // ✅ Correct field name (not item_id)
        renter_id: user.id as string,
        owner_id: listing.owner_id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        price_per_day: listing.price_per_day, // ✅ Correct field name
        subtotal,
        service_fee: serviceFee,
        total_amount: totalAmount,
        deposit_amount: listing.deposit, // ✅ Correct field name (deposit_amount not deposit)
        status: 'pending',
        delivery_method: bookingData.delivery_method,
        delivery_address: bookingData.delivery_address || null,
        pickup_location: bookingData.pickup_location || null,
        pickup_instructions: bookingData.pickup_instructions || null,
        renter_message: bookingData.renter_message || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
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

    // Create Stripe payment intent with Connect
    try {
      const totalAmountCents = Math.round((totalAmount + listing.deposit) * 100);
      const platformFeeCents = Math.round(serviceFee * 100); // Platform keeps service fee

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountCents,
        currency: 'aud',
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: ownerProfile.stripe_account_id,
        },
        metadata: {
          booking_id: booking.id,
          listing_id: listing.id,
          renter_id: user.id,
          owner_id: listing.owner_id,
          total_amount: totalAmount.toString(),
          service_fee: serviceFee.toString(),
          deposit_amount: listing.deposit.toString(),
        },
        description: `Rent It Forward: ${listing.title}`,
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

      return NextResponse.json({
        booking: { 
          ...booking, 
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: 'pending'
        },
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