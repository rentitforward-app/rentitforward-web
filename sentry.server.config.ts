// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Configure environment
  environment: process.env.NODE_ENV,

  // Configure release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || '1.0.0',

  // Add custom tags and context
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      platform: 'web',
      app: 'rentitforward-web',
    };
    return event;
  },

  integrations: [
    Sentry.extraErrorDataIntegration(),
    Sentry.nodeContextIntegration(),
  ],

  autoSessionTracking: true,
});
