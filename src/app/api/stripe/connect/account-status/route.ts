import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(request: NextRequest) {
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
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // If no Stripe account, return empty status
    if (!profile.stripe_account_id) {
      return NextResponse.json({
        has_account: false,
        onboarding_completed: false,
        payouts_enabled: false,
        charges_enabled: false,
      });
    }

    console.log(`Checking Stripe account status for: ${profile.stripe_account_id}`);

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const onboardingCompleted = !!account.details_submitted;
    const payoutsEnabled = !!account.payouts_enabled;
    const chargesEnabled = !!account.charges_enabled;

    // Update local onboarding status if changed
    if (profile.stripe_onboarding_completed !== onboardingCompleted) {
      await supabase
        .from('profiles')
        .update({ 
          stripe_onboarding_completed: onboardingCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return NextResponse.json({
      has_account: true,
      account_id: profile.stripe_account_id,
      onboarding_completed: onboardingCompleted,
      payouts_enabled: payoutsEnabled,
      charges_enabled: chargesEnabled,
      requirements: account.requirements,
      business_profile: account.business_profile,
    });

  } catch (error) {
    console.error('Failed to check Stripe account status:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      // If account not found, reset the profile
      if (error.code === 'resource_missing') {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ 
              stripe_account_id: null,
              stripe_onboarding_completed: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }
        
        return NextResponse.json({
          has_account: false,
          onboarding_completed: false,
          payouts_enabled: false,
          charges_enabled: false,
        });
      }
      
      return NextResponse.json({
        error: 'Stripe error: ' + error.message,
        type: error.type,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to check account status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
