// This file configures the initialization of Sentry on the browser side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Configure environment
  environment: process.env.NODE_ENV,

  // Configure release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || '1.0.0',

  // Replay can be used to record user sessions
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  // Add more context data to events
  sendDefaultPii: true,

  // Configure integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content
      maskAllText: true,
      // Block all media
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.extraErrorDataIntegration(),
  ],

  // Add custom tags and context
  beforeSend(event) {
    // Add custom tags
    event.tags = {
      ...event.tags,
      platform: 'web',
      app: 'rentitforward-web',
    };

    // Add custom context
    event.contexts = {
      ...event.contexts,
      runtime: {
        name: 'browser',
        version: navigator.userAgent,
      },
    };

    // Filter out sensitive data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Event:', event);
    }

    return event;
  },

  // Configure session tracking
  autoSessionTracking: true,

  // Configure error boundaries
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }
    return breadcrumb;
  },
});
