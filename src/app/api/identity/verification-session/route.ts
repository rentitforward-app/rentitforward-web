import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create a verification session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      provided_details: {
        email: profile.email,
      },
      metadata: {
        user_id: user.id,
        email: profile.email,
        full_name: profile.full_name || '',
      },
      options: {
        document: {
          allowed_types: ['passport', 'driving_license', 'id_card'],
          require_id_number: true,
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/settings?verification_complete=true`,
    });

    // Store verification session in database
    await supabase
      .from('identity_verifications')
      .upsert({
        user_id: user.id,
        stripe_verification_session_id: verificationSession.id,
        status: 'requires_input',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Return only the client secret to the frontend
    return NextResponse.json({
      client_secret: verificationSession.client_secret,
      verification_session_id: verificationSession.id,
    });

  } catch (error) {
    console.error('Error creating verification session:', error);
    return NextResponse.json(
      { error: 'Failed to create verification session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current verification status from database
    const { data: verification, error: verificationError } = await supabase
      .from('identity_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verificationError && verificationError.code !== 'PGRST116') {
      console.error('Error fetching verification:', verificationError);
      return NextResponse.json(
        { error: 'Failed to fetch verification status' },
        { status: 500 }
      );
    }

    if (!verification) {
      return NextResponse.json({
        status: 'not_started',
        verification: null,
      });
    }

    // If we have a verification session, fetch latest status from Stripe
    try {
      const stripeVerification = await stripe.identity.verificationSessions.retrieve(
        verification.stripe_verification_session_id
      );

      // Update local status if it has changed
      if (stripeVerification.status !== verification.status) {
        await supabase
          .from('identity_verifications')
          .update({
            status: stripeVerification.status,
            verified_outputs: stripeVerification.verified_outputs,
            last_error: stripeVerification.last_error,
            updated_at: new Date().toISOString(),
          })
          .eq('id', verification.id);
      }

      return NextResponse.json({
        status: stripeVerification.status,
        verification: {
          ...verification,
          status: stripeVerification.status,
          verified_outputs: stripeVerification.verified_outputs,
          last_error: stripeVerification.last_error,
        },
        stripe_verification: {
          status: stripeVerification.status,
          verified_outputs: stripeVerification.verified_outputs,
          last_error: stripeVerification.last_error,
          created: stripeVerification.created,
        },
      });

    } catch (stripeError) {
      console.error('Error fetching from Stripe:', stripeError);
      // Return local status if Stripe fetch fails
      return NextResponse.json({
        status: verification.status,
        verification,
      });
    }

  } catch (error) {
    console.error('Error in verification session GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



