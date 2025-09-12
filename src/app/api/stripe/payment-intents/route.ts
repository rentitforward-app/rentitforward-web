import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      amount, 
      currency, 
      booking_id, 
      owner_stripe_account_id,
      payment_method_id,
      application_fee_amount 
    } = body;

    if (!amount || !currency || !booking_id || !owner_stripe_account_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get the authenticated user from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: 'User does not have a Stripe customer ID' },
        { status: 400 }
      );
    }

    // Verify the booking belongs to the user
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('renter_id', user.id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found or does not belong to user' },
        { status: 404 }
      );
    }

    // Create PaymentIntent with Connect account (for marketplace payments)
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: profile.stripe_customer_id,
      transfer_data: {
        destination: owner_stripe_account_id,
      },
      metadata: {
        booking_id,
        renter_id: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // For mobile apps
      },
    };

    // Add application fee if specified (platform commission)
    if (application_fee_amount) {
      paymentIntentParams.application_fee_amount = Math.round(application_fee_amount * 100);
    }

    // Add payment method if specified
    if (payment_method_id) {
      paymentIntentParams.payment_method = payment_method_id;
      paymentIntentParams.confirmation_method = 'manual';
      paymentIntentParams.confirm = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Update booking with payment intent ID
    await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'payment_processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id);

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      status: paymentIntent.status,
    });

  } catch (error: any) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create payment intent' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent_id');

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'payment_intent_id parameter required' },
        { status: 400 }
      );
    }

    // Get the authenticated user from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify the payment intent belongs to the user
    if (paymentIntent.metadata.renter_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Payment intent does not belong to authenticated user' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        client_secret: paymentIntent.client_secret,
      },
    });

  } catch (error: any) {
    console.error('Payment intent retrieval error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to retrieve payment intent' 
      },
      { status: 500 }
    );
  }
}
