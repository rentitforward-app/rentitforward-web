import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // If no Stripe account exists
    if (!profile.stripe_account_id) {
      return NextResponse.json({
        has_account: false,
        onboarding_completed: false,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: [],
        payout_methods: [],
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    // Get external accounts (bank accounts/cards)
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      profile.stripe_account_id,
      { limit: 10 }
    );

    // Get recent payouts
    const payouts = await stripe.payouts.list(
      { limit: 5 },
      { stripeAccount: profile.stripe_account_id }
    );

    return NextResponse.json({
      has_account: true,
      account_id: account.id,
      onboarding_completed: account.details_submitted && account.charges_enabled,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due || [],
      payout_methods: externalAccounts.data.map((account: any) => ({
        id: account.id,
        type: account.object, // 'bank_account' or 'card'
        last4: account.last4,
        bank_name: account.bank_name,
        currency: account.currency,
        default_for_currency: account.default_for_currency,
      })),
      recent_payouts: payouts.data.map((payout: any) => ({
        id: payout.id,
        amount: payout.amount / 100, // Convert from cents
        currency: payout.currency,
        status: payout.status,
        arrival_date: payout.arrival_date,
        created: payout.created,
      })),
      payout_schedule: account.settings?.payouts?.schedule || null,
    });

  } catch (error) {
    console.error('Error getting account status:', error);
    return NextResponse.json(
      { error: 'Failed to get account status' },
      { status: 500 }
    );
  }
}
