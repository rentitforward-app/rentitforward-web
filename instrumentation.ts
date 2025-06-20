export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    await import('./sentry.edge.config');
  }
}

// Required for capturing request errors from nested React Server Components
export async function onRequestError(err: unknown, request: Request, context: { routerKind: string }) {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
} 