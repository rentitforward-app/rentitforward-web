import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with Stripe account info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account found' }, { status: 404 });
    }

    console.log(`Creating refresh onboarding link for: ${profile.stripe_account_id}`);

    // Create new account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      refresh_url: `${baseUrl}/profile/stripe/refresh`,
      return_url: `${baseUrl}/profile/stripe/success`,
      type: 'account_onboarding',
    });

    console.log(`✅ Created refresh onboarding link for account: ${profile.stripe_account_id}`);

    return NextResponse.json({
      success: true,
      onboarding_url: accountLink.url,
    });

  } catch (error) {
    console.error('Failed to create refresh onboarding link:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error: 'Stripe error: ' + error.message,
        type: error.type,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create refresh link',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
