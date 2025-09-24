/**
 * GET /api/admin/env-check
 * 
 * Admin endpoint to check environment configuration for notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateEnvironmentConfig, getMissingConfiguration } from '@/lib/env-validation';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user and verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Validate environment configuration
    const validation = validateEnvironmentConfig();
    const missing = getMissingConfiguration();

    // Test database connection
    let databaseStatus = 'connected';
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (dbError) {
        databaseStatus = `error: ${dbError.message}`;
      }
    } catch (dbError) {
      databaseStatus = `error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
    }

    // Test FCM configuration
    let fcmStatus = 'not_configured';
    if (validation.config.fcm.configured) {
      try {
        const { fcmAdminService } = await import('@/lib/fcm/admin');
        // Try to get a dummy user's tokens (this will test FCM initialization)
        await fcmAdminService.getUserFCMTokens('test-user-id');
        fcmStatus = 'configured';
      } catch (fcmError) {
        fcmStatus = `error: ${fcmError instanceof Error ? fcmError.message : 'FCM initialization failed'}`;
      }
    }

    // Test Resend configuration
    let resendStatus = 'not_configured';
    if (validation.config.resend.configured) {
      try {
        const { unifiedEmailService } = await import('@/lib/email/unified-email-service');
        // Just check if the service can be instantiated
        resendStatus = 'configured';
      } catch (resendError) {
        resendStatus = `error: ${resendError instanceof Error ? resendError.message : 'Resend initialization failed'}`;
      }
    }

    return NextResponse.json({
      success: true,
      environment_valid: validation.isValid,
      services: {
        database: {
          status: databaseStatus,
          configured: validation.config.supabase.configured,
        },
        email: {
          status: resendStatus,
          configured: validation.config.resend.configured,
        },
        push_notifications: {
          status: fcmStatus,
          configured: validation.config.fcm.configured,
        },
        payments: {
          status: validation.config.stripe.configured ? 'configured' : 'not_configured',
          configured: validation.config.stripe.configured,
        },
      },
      configuration: validation.config,
      errors: validation.errors,
      warnings: validation.warnings,
      missing_variables: missing,
      setup_instructions: {
        resend: missing.resend.length > 0 ? [
          '1. Sign up for Resend at https://resend.com',
          '2. Create an API key in your Resend dashboard',
          '3. Add RESEND_API_KEY to your environment variables',
          '4. Optionally set RESEND_FROM_EMAIL (defaults to "Rent it Forward <noreply@rentitforward.com>")',
        ] : null,
        fcm: missing.fcm.length > 0 ? [
          '1. Go to Firebase Console: https://console.firebase.google.com',
          '2. Select your project or create a new one',
          '3. Go to Project Settings > Service Accounts',
          '4. Generate a new private key and download the JSON file',
          '5. Extract FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL',
          '6. Go to Project Settings > General and copy the web app config',
          '7. Add all NEXT_PUBLIC_FIREBASE_* variables to your environment',
          '8. Go to Project Settings > Cloud Messaging and generate a VAPID key',
          '9. Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your environment',
        ] : null,
        supabase: missing.supabase.length > 0 ? [
          '1. Go to your Supabase project dashboard',
          '2. Go to Settings > API',
          '3. Copy the Project URL and anon/public key',
          '4. Copy the service_role key (keep this secret)',
          '5. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY',
        ] : null,
        stripe: missing.stripe.length > 0 ? [
          '1. Go to your Stripe Dashboard',
          '2. Go to Developers > API Keys',
          '3. Copy the Secret key (starts with sk_)',
          '4. Go to Developers > Webhooks',
          '5. Create a webhook endpoint and copy the signing secret',
          '6. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET',
        ] : null,
      },
    });

  } catch (error) {
    console.error('Error checking environment configuration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check environment configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
