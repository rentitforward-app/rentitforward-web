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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user already has a Stripe account
    if (profile.stripe_account_id) {
      return NextResponse.json({ 
        error: 'User already has a connected Stripe account',
        account_id: profile.stripe_account_id 
      }, { status: 400 });
    }

    const body = await request.json();
    const { business_type = 'individual' } = body;

    console.log(`Creating Stripe Connect account for user: ${user.id}`);

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      business_type: business_type,
      capabilities: {
        transfers: { requested: true },
      },
      business_profile: {
        product_description: 'Peer-to-peer item rentals through Rent It Forward',
        mcc: '7299', // Miscellaneous Personal Services
      },
      metadata: {
        user_id: user.id,
        email: profile.email,
        platform: 'rent_it_forward',
      },
    });

    console.log(`✅ Created Stripe account: ${account.id} for user: ${user.id}`);

    // Update user profile with Stripe account ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        stripe_account_id: account.id,
        stripe_onboarding_completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile with Stripe account:', updateError);
      // Try to delete the Stripe account if profile update fails
      try {
        await stripe.accounts.del(account.id);
      } catch (deleteError) {
        console.error('Failed to cleanup Stripe account:', deleteError);
      }
      return NextResponse.json({ error: 'Failed to save account information' }, { status: 500 });
    }

    // Create account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/profile/stripe/refresh`,
      return_url: `${baseUrl}/profile/stripe/success`,
      type: 'account_onboarding',
    });

    console.log(`✅ Created onboarding link for account: ${account.id}`);

    return NextResponse.json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url,
    });

  } catch (error) {
    console.error('Stripe Connect account creation failed:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error: 'Stripe error: ' + error.message,
        type: error.type,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create Stripe account',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
