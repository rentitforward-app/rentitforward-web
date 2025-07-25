import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with Stripe info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_customer_id, stripe_onboarded, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has Stripe account
    if (!profile.stripe_account_id) {
      return NextResponse.json({ 
        connected: false, 
        onboarding_complete: false,
        has_customer_account: !!profile.stripe_customer_id,
      });
    }

    // Get real account status from Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    
    // Determine if onboarding is complete
    const isComplete = account.charges_enabled && account.payouts_enabled;
    
    // Update database if status changed
    if (isComplete !== profile.stripe_onboarded) {
      await supabase
        .from('profiles')
        .update({ stripe_onboarded: isComplete })
        .eq('id', user.id);
    }

    // Return real account status
    return NextResponse.json({
      connected: true,
      onboarding_complete: isComplete,
      account_id: profile.stripe_account_id,
      has_customer_account: !!profile.stripe_customer_id,
      verification: {
        overall_status: isComplete ? 'verified' : 'pending',
        identity_verification: {
          status: account.individual?.verification?.status || 'unverified',
          details: account.individual?.verification?.details || null,
        },
        document_verification: {
          front_uploaded: !!account.individual?.verification?.document?.front,
          back_uploaded: !!account.individual?.verification?.document?.back,
          status: account.individual?.verification?.document?.back 
            ? 'verified' 
            : account.individual?.verification?.document?.front 
              ? 'pending' 
              : 'unverified',
        },
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          pending_verification: account.requirements?.pending_verification || [],
        },
      },
      capabilities: {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      },
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || [],
        pending_verification: account.requirements?.pending_verification || [],
        disabled_reason: account.requirements?.disabled_reason || null,
      },
      business_type: account.business_type,
      country: account.country,
    });

  } catch (error) {
    console.error('Error in Stripe Connect API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_customer_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create onboarding link for existing accounts
    if (action === 'create_onboarding_link') {
      const accountId = profile.stripe_account_id;
      
      if (!accountId) {
        return NextResponse.json({ error: 'No Stripe account found' }, { status: 400 });
      }

      // Use Stripe API directly instead of utility function
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      const refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe_refresh=true`;
      const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe_return=true`;

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return NextResponse.json({ 
        onboarding_url: link.url 
      });
    }

    // Create Stripe customer account
    if (action === 'create_customer') {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      // Create customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile.full_name || '',
        metadata: {
          user_id: user.id,
        },
      });

      // Save customer ID to user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          stripe_customer_id: customer.id
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile with Stripe customer:', updateError);
        return NextResponse.json({ error: 'Failed to save customer information' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        customer_id: customer.id,
        message: 'Stripe customer account created successfully'
      });
    }

    // Create new Stripe Express account
    if (action === 'create_account') {
      // Check if user already has an account
      if (profile.stripe_account_id) {
        return NextResponse.json({ error: 'User already has a Stripe account' }, { status: 400 });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      // Create Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU', // Australia
        email: user.email,
        metadata: {
          user_id: user.id,
          user_name: profile.full_name || '',
        },
      });

      // Save account ID to user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          stripe_account_id: account.id,
          stripe_onboarded: false 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile with Stripe account:', updateError);
        return NextResponse.json({ error: 'Failed to save account information' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        account_id: account.id,
        message: 'Stripe Express account created successfully'
      });
    }

    // Create login link for account management  
    if (action === 'create_login_link') {
      const accountId = profile.stripe_account_id;
      
      if (!accountId) {
        return NextResponse.json({ error: 'No Stripe account found' }, { status: 400 });
      }

      // Use Stripe API directly
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const loginLink = await stripe.accounts.createLoginLink(accountId);

      return NextResponse.json({ 
        login_url: loginLink.url 
      });
    }

    // Upload verification documents
    if (action === 'upload_verification_document') {
      const accountId = profile.stripe_account_id;
      
      if (!accountId) {
        return NextResponse.json({ error: 'No Stripe account found' }, { status: 400 });
      }

      const { document_type, front_image, back_image } = await request.json();
      
      if (!document_type || !front_image) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      try {
        // Create file upload for front image
        const frontFile = await stripe.files.create({
          purpose: 'identity_document',
          file: {
            data: Buffer.from(front_image, 'base64'),
            name: 'identity_front.jpg',
            type: 'image/jpeg',
          },
        });

        let backFile = null;
        if (back_image) {
          backFile = await stripe.files.create({
            purpose: 'identity_document',
            file: {
              data: Buffer.from(back_image, 'base64'),
              name: 'identity_back.jpg',
              type: 'image/jpeg',
            },
          });
        }

        // Update account with verification documents
        const updateData: any = {};
        
        if (document_type === 'identity_document') {
          updateData.individual = {
            verification: {
              document: {
                front: frontFile.id,
                ...(backFile && { back: backFile.id }),
              },
            },
          };
        }

        await stripe.accounts.update(accountId, updateData);

        return NextResponse.json({ 
          success: true,
          message: 'Documents uploaded successfully'
        });
      } catch (stripeError: any) {
        console.error('Stripe file upload error:', stripeError);
        return NextResponse.json({ 
          error: stripeError.message || 'Failed to upload documents'
        }, { status: 400 });
      }
    }

    // Other actions temporarily disabled
    return NextResponse.json({ 
      error: `Action '${action}' not implemented yet` 
    }, { status: 501 });

  } catch (error) {
    console.error('Error in Stripe Connect POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 