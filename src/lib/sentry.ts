import * as Sentry from '@sentry/nextjs';

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string; name?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

/**
 * Clear user context from Sentry
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(message: string, category?: string, data?: any): void {
  Sentry.addBreadcrumb({
    message,
    category: category || 'user',
    data,
    level: 'info',
  });
}

/**
 * Capture exception manually
 */
export function captureSentryException(error: Error, context?: any): void {
  Sentry.captureException(error, {
    tags: {
      source: 'manual',
    },
    extra: context,
  });
}

/**
 * Capture message manually
 */
export function captureSentryMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any): void {
  Sentry.captureMessage(message, level);
  if (context) {
    Sentry.setContext('custom_context', context);
  }
}

/**
 * Set custom context for Sentry
 */
export function setSentryContext(key: string, context: any): void {
  Sentry.setContext(key, context);
}

/**
 * Set custom tags for Sentry
 */
export function setSentryTags(tags: Record<string, string>): void {
  Sentry.setTags(tags);
}

/**
 * Start a Sentry transaction for performance monitoring
 * Note: startTransaction is deprecated in newer versions of Sentry
 * Use Sentry.startSpan or Sentry.startInactiveSpan instead
 */
export function startSentryTransaction(name: string, op: string = 'navigation'): any {
  // Use the newer span API
  return Sentry.startSpan({
    name,
    op,
  }, () => {});
}

/**
 * Capture web vitals for performance monitoring
 */
export function captureWebVitals(metric: any): void {
  Sentry.addBreadcrumb({
    message: `Web Vital: ${metric.name}`,
    category: 'web-vital',
    data: {
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      name: metric.name,
    },
    level: metric.value > 1000 ? 'warning' : 'info',
  });
}
