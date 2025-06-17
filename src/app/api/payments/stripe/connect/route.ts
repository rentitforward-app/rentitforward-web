import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// GET - Check account status
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with Stripe account info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id as any)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = profile as any;

    if (!profileData.stripe_account_id) {
      return NextResponse.json({ 
        connected: false, 
        onboarding_complete: false 
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(profileData.stripe_account_id);
    
    const isComplete = account.details_submitted && 
                      account.charges_enabled && 
                      account.payouts_enabled;

    // Update local status if it differs
    if (isComplete !== profileData.stripe_onboarding_complete) {
      await supabase
        .from('profiles')
        .update({ stripe_onboarding_complete: isComplete } as any)
        .eq('id', user.id as any);
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: isComplete,
      account_id: profileData.stripe_account_id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due || [],
    });

  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    return NextResponse.json({ error: 'Failed to check account status' }, { status: 500 });
  }
}

// POST - Create Connect account or onboarding link
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id as any)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = profile as any;

    if (action === 'create_account') {
      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        country: 'AU', // Australia
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_profile: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/profile/${user.id}`,
        },
        metadata: {
          user_id: user.id,
          full_name: profileData.full_name || '',
        },
      });

      // Save account ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_account_id: account.id } as any)
        .eq('id', user.id as any);

      return NextResponse.json({ 
        account_id: account.id,
        created: true 
      });
    }

    if (action === 'create_onboarding_link') {
      const accountId = profileData.stripe_account_id;
      
      if (!accountId) {
        return NextResponse.json({ error: 'No Stripe account found' }, { status: 400 });
      }

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe_refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe_return=true`,
        type: 'account_onboarding',
      });

      return NextResponse.json({ 
        onboarding_url: accountLink.url 
      });
    }

    if (action === 'create_login_link') {
      const accountId = profileData.stripe_account_id;
      
      if (!accountId) {
        return NextResponse.json({ error: 'No Stripe account found' }, { status: 400 });
      }

      // Create login link for existing accounts
      const loginLink = await stripe.accounts.createLoginLink(accountId);

      return NextResponse.json({ 
        login_url: loginLink.url 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error with Stripe Connect:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 