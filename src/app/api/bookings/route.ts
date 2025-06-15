import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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
          daily_rate
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
      query = query.eq('renter_id', user.id);
    } else if (type === 'owner') {
      query = query.eq('owner_id', user.id);
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

    // Calculate dates and pricing
    const startDate = new Date(bookingData.start_date);
    const endDate = new Date(bookingData.end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    // Calculate pricing
    let subtotal = 0;
    if (totalDays >= 30 && listing.monthly_rate) {
      const months = Math.floor(totalDays / 30);
      const remainingDays = totalDays % 30;
      subtotal = (months * listing.monthly_rate) + (remainingDays * listing.daily_rate);
    } else if (totalDays >= 7 && listing.weekly_rate) {
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;
      subtotal = (weeks * listing.weekly_rate) + (remainingDays * listing.daily_rate);
    } else {
      subtotal = totalDays * listing.daily_rate;
    }

    const serviceFee = subtotal * 0.05; // 5% service fee
    const totalAmount = subtotal + serviceFee;

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        listing_id: bookingData.listing_id,
        renter_id: user.id,
        owner_id: listing.owner_id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        total_days: totalDays,
        daily_rate: listing.daily_rate,
        subtotal,
        service_fee: serviceFee,
        total_amount: totalAmount,
        deposit_amount: listing.deposit_amount,
        status: 'pending',
        delivery_method: bookingData.delivery_method,
        delivery_address: bookingData.delivery_address || null,
        pickup_address: bookingData.pickup_address || null,
        special_instructions: bookingData.special_instructions || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // Create Stripe payment intent
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round((totalAmount + listing.deposit_amount) * 100), // Convert to cents
        currency: 'aud',
        metadata: {
          booking_id: booking.id,
          listing_id: listing.id,
          renter_id: user.id,
          owner_id: listing.owner_id,
        },
        description: `Booking for ${listing.title}`,
      });

      // Update booking with payment intent ID
      await supabase
        .from('bookings')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', booking.id);

      return NextResponse.json({
        booking: { ...booking, stripe_payment_intent_id: paymentIntent.id },
        client_secret: paymentIntent.client_secret,
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