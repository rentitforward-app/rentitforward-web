/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are properly configured
 * for email notifications (Resend) and push notifications (FCM)
 */

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    resend: {
      configured: boolean;
      apiKey: boolean;
      fromEmail: boolean;
    };
    fcm: {
      configured: boolean;
      projectId: boolean;
      privateKey: boolean;
      clientEmail: boolean;
      webConfig: boolean;
      vapidKey: boolean;
    };
    supabase: {
      configured: boolean;
      url: boolean;
      anonKey: boolean;
      serviceRoleKey: boolean;
    };
    stripe: {
      configured: boolean;
      secretKey: boolean;
      webhookSecret: boolean;
    };
  };
}

/**
 * Validate all required environment variables for notifications
 */
export function validateEnvironmentConfig(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Resend Email Configuration
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  
  const resendConfigured = !!(resendApiKey && resendFromEmail);
  
  if (!resendApiKey) {
    errors.push('RESEND_API_KEY is not set - email notifications will fail');
  } else if (resendApiKey.includes('YOUR_RESEND_API_KEY')) {
    errors.push('RESEND_API_KEY contains placeholder value - replace with actual API key');
  }
  
  if (!resendFromEmail) {
    warnings.push('RESEND_FROM_EMAIL is not set - using default noreply@rentitforward.com');
  }

  // Firebase FCM Configuration (Server-side)
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  const fcmServerConfigured = !!(firebaseProjectId && firebasePrivateKey && firebaseClientEmail);
  
  if (!firebaseProjectId) {
    errors.push('FIREBASE_PROJECT_ID is not set - FCM push notifications will fail');
  } else if (firebaseProjectId.includes('your_firebase_project_id')) {
    errors.push('FIREBASE_PROJECT_ID contains placeholder value - replace with actual project ID');
  }
  
  if (!firebasePrivateKey) {
    errors.push('FIREBASE_PRIVATE_KEY is not set - FCM push notifications will fail');
  } else if (firebasePrivateKey.includes('YOUR_FIREBASE_PRIVATE_KEY_HERE')) {
    errors.push('FIREBASE_PRIVATE_KEY contains placeholder value - replace with actual private key');
  }
  
  if (!firebaseClientEmail) {
    errors.push('FIREBASE_CLIENT_EMAIL is not set - FCM push notifications will fail');
  } else if (firebaseClientEmail.includes('your-service-account@')) {
    errors.push('FIREBASE_CLIENT_EMAIL contains placeholder value - replace with actual client email');
  }

  // Firebase FCM Configuration (Client-side)
  const nextPublicFirebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const nextPublicFirebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const nextPublicFirebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const nextPublicFirebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const nextPublicFirebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const nextPublicFirebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const nextPublicFirebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  
  const fcmWebConfigured = !!(
    nextPublicFirebaseApiKey && 
    nextPublicFirebaseAuthDomain && 
    nextPublicFirebaseProjectId && 
    nextPublicFirebaseStorageBucket && 
    nextPublicFirebaseMessagingSenderId && 
    nextPublicFirebaseAppId
  );
  
  if (!nextPublicFirebaseApiKey) {
    errors.push('NEXT_PUBLIC_FIREBASE_API_KEY is not set - web FCM will fail');
  }
  
  if (!nextPublicFirebaseAuthDomain) {
    errors.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not set - web FCM will fail');
  }
  
  if (!nextPublicFirebaseProjectId) {
    errors.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set - web FCM will fail');
  }
  
  if (!nextPublicFirebaseStorageBucket) {
    errors.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set - web FCM will fail');
  }
  
  if (!nextPublicFirebaseMessagingSenderId) {
    errors.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is not set - web FCM will fail');
  }
  
  if (!nextPublicFirebaseAppId) {
    errors.push('NEXT_PUBLIC_FIREBASE_APP_ID is not set - web FCM will fail');
  }
  
  if (!nextPublicFirebaseVapidKey) {
    warnings.push('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set - web push notifications may not work');
  }

  // Supabase Configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
  
  if (!supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set - database operations will fail');
  }
  
  if (!supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set - client database operations will fail');
  }
  
  if (!supabaseServiceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is not set - server database operations will fail');
  }

  // Stripe Configuration
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  const stripeConfigured = !!(stripeSecretKey && stripeWebhookSecret);
  
  if (!stripeSecretKey) {
    errors.push('STRIPE_SECRET_KEY is not set - payment operations will fail');
  }
  
  if (!stripeWebhookSecret) {
    warnings.push('STRIPE_WEBHOOK_SECRET is not set - webhook verification will fail');
  }

  // Additional validation
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    warnings.push('NEXT_PUBLIC_BASE_URL is not set - email links may not work correctly');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config: {
      resend: {
        configured: resendConfigured,
        apiKey: !!resendApiKey,
        fromEmail: !!resendFromEmail,
      },
      fcm: {
        configured: fcmServerConfigured && fcmWebConfigured,
        projectId: !!firebaseProjectId,
        privateKey: !!firebasePrivateKey,
        clientEmail: !!firebaseClientEmail,
        webConfig: fcmWebConfigured,
        vapidKey: !!nextPublicFirebaseVapidKey,
      },
      supabase: {
        configured: supabaseConfigured,
        url: !!supabaseUrl,
        anonKey: !!supabaseAnonKey,
        serviceRoleKey: !!supabaseServiceRoleKey,
      },
      stripe: {
        configured: stripeConfigured,
        secretKey: !!stripeSecretKey,
        webhookSecret: !!stripeWebhookSecret,
      },
    },
  };
}

/**
 * Log environment validation results to console
 */
export function logEnvironmentValidation(): void {
  const validation = validateEnvironmentConfig();
  
  console.log('\n🔧 Environment Configuration Validation');
  console.log('==========================================');
  
  if (validation.isValid) {
    console.log('✅ All required environment variables are configured');
  } else {
    console.log('❌ Environment configuration issues detected');
  }
  
  // Log configuration status
  console.log('\n📧 Email (Resend):', validation.config.resend.configured ? '✅' : '❌');
  console.log('🔔 Push Notifications (FCM):', validation.config.fcm.configured ? '✅' : '❌');
  console.log('🗄️  Database (Supabase):', validation.config.supabase.configured ? '✅' : '❌');
  console.log('💳 Payments (Stripe):', validation.config.stripe.configured ? '✅' : '❌');
  
  // Log errors
  if (validation.errors.length > 0) {
    console.log('\n❌ Errors:');
    validation.errors.forEach(error => console.log(`  • ${error}`));
  }
  
  // Log warnings
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach(warning => console.log(`  • ${warning}`));
  }
  
  console.log('\n==========================================\n');
}

/**
 * Get Firebase configuration from environment variables
 */
export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/**
 * Check if notifications are properly configured
 */
export function areNotificationsConfigured(): boolean {
  const validation = validateEnvironmentConfig();
  return validation.config.resend.configured && validation.config.fcm.configured;
}

/**
 * Get missing configuration details for setup instructions
 */
export function getMissingConfiguration(): {
  resend: string[];
  fcm: string[];
  supabase: string[];
  stripe: string[];
} {
  const validation = validateEnvironmentConfig();
  
  const missing = {
    resend: [] as string[],
    fcm: [] as string[],
    supabase: [] as string[],
    stripe: [] as string[],
  };
  
  // Check Resend
  if (!validation.config.resend.apiKey) missing.resend.push('RESEND_API_KEY');
  if (!validation.config.resend.fromEmail) missing.resend.push('RESEND_FROM_EMAIL');
  
  // Check FCM
  if (!validation.config.fcm.projectId) missing.fcm.push('FIREBASE_PROJECT_ID');
  if (!validation.config.fcm.privateKey) missing.fcm.push('FIREBASE_PRIVATE_KEY');
  if (!validation.config.fcm.clientEmail) missing.fcm.push('FIREBASE_CLIENT_EMAIL');
  if (!validation.config.fcm.webConfig) {
    missing.fcm.push('NEXT_PUBLIC_FIREBASE_*');
  }
  if (!validation.config.fcm.vapidKey) missing.fcm.push('NEXT_PUBLIC_FIREBASE_VAPID_KEY');
  
  // Check Supabase
  if (!validation.config.supabase.url) missing.supabase.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!validation.config.supabase.anonKey) missing.supabase.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!validation.config.supabase.serviceRoleKey) missing.supabase.push('SUPABASE_SERVICE_ROLE_KEY');
  
  // Check Stripe
  if (!validation.config.stripe.secretKey) missing.stripe.push('STRIPE_SECRET_KEY');
  if (!validation.config.stripe.webhookSecret) missing.stripe.push('STRIPE_WEBHOOK_SECRET');
  
  return missing;
}
