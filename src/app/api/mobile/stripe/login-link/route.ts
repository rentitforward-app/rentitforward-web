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

export async function POST(request: NextRequest) {
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

    if (profileError || !profile || !profile.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe account not found' },
        { status: 404 }
      );
    }

    if (!profile.stripe_onboarding_completed) {
      return NextResponse.json(
        { error: 'Onboarding must be completed first' },
        { status: 400 }
      );
    }

    // Create login link for Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id);

    return NextResponse.json({
      url: loginLink.url,
      created: loginLink.created,
    });

  } catch (error) {
    console.error('Error creating login link:', error);
    return NextResponse.json(
      { error: 'Failed to create login link' },
      { status: 500 }
    );
  }
}
