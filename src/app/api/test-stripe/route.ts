import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET() {
  try {
    // Check if Stripe keys are configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ 
        error: 'STRIPE_SECRET_KEY not configured',
        configured: false 
      }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      return NextResponse.json({ 
        error: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured',
        configured: false 
      }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    // Test API connectivity
    const account = await stripe.accounts.retrieve();
    
    return NextResponse.json({
      success: true,
      configured: true,
      account_id: account.id,
      account_type: account.type,
      business_profile: account.business_profile?.name || 'Not set',
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      keys_configured: {
        secret_key: process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing',
        publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Configured' : '❌ Missing',
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ? '✅ Configured' : '❌ Missing',
      },
      connect_ready: account.charges_enabled && account.payouts_enabled,
    });

  } catch (error) {
    console.error('Stripe test error:', error);
    
    return NextResponse.json({
      success: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      keys_configured: {
        secret_key: process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing',
        publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Configured' : '❌ Missing',
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ? '✅ Configured' : '❌ Missing',
      },
    }, { status: 500 });
  }
} 