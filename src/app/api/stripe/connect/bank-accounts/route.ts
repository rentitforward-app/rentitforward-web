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
    const { account_id, bank_account } = body;

    if (!account_id || !bank_account) {
      return NextResponse.json(
        { success: false, error: 'account_id and bank_account are required' },
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

    // Verify the Connect account belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_account_id !== account_id) {
      return NextResponse.json(
        { success: false, error: 'Connect account does not belong to authenticated user' },
        { status: 403 }
      );
    }

    // Add external bank account to Connect account
    const externalAccount = await stripe.accounts.createExternalAccount(
      account_id,
      {
        external_account: {
          object: 'bank_account',
          country: bank_account.country,
          currency: bank_account.currency,
          account_holder_name: bank_account.account_holder_name,
          account_holder_type: bank_account.account_holder_type,
          routing_number: bank_account.routing_number, // BSB for Australia
          account_number: bank_account.account_number,
        },
      }
    );

    // Update user profile with bank account details (masked)
    await supabase
      .from('profiles')
      .update({
        bank_account_setup: true,
        bank_account_name: bank_account.account_holder_name,
        bank_account_last4: bank_account.account_number.slice(-4),
        bank_bsb: bank_account.routing_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      bank_account_id: externalAccount.id,
    });

  } catch (error: any) {
    console.error('Bank account creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to add bank account' 
      },
      { status: 500 }
    );
  }
}
