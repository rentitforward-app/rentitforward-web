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
    const { type, country, email, business_type } = body;

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

    // Check if user already has a Connect account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_account_id) {
      return NextResponse.json({
        success: true,
        account_id: profile.stripe_account_id,
      });
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: type || 'express',
      country: country || 'AU',
      email: email || user.email,
      business_type: business_type || 'individual',
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: {
        supabase_user_id: user.id,
      },
    });

    // Update user profile with Connect account ID
    await supabase
      .from('profiles')
      .update({ 
        stripe_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      account_id: account.id,
    });

  } catch (error: any) {
    console.error('Connect account creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create Connect account' 
      },
      { status: 500 }
    );
  }
}
