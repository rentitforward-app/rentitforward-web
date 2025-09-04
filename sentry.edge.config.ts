// This file configures the initialization of Sentry for edge features (middleware, edge functions, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Configure environment
  environment: process.env.NODE_ENV,

  // Configure release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || '1.0.0',

  // Add custom tags and context
  beforeSend(event) {
    // Add custom tags
    event.tags = {
      ...event.tags,
      platform: 'web',
      app: 'rentitforward-web',
      runtime: 'edge',
    };

    // Filter out sensitive data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Edge Event:', event);
    }

    return event;
  },

  // Configure integrations for edge runtime
  integrations: [
    Sentry.extraErrorDataIntegration(),
  ],
});
