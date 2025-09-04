# Sentry Integration for Rent It Forward Web

This document describes the Sentry integration setup for error monitoring and performance tracking in the Rent It Forward web application.

## Overview

Sentry is configured to provide:
- **Error Monitoring**: Automatic capture of JavaScript errors and exceptions
- **Performance Monitoring**: Track web performance and Core Web Vitals
- **User Context**: Associate errors with specific users
- **Breadcrumbs**: Track user actions leading to errors
- **Session Replay**: Record user sessions for debugging
- **Release Tracking**: Monitor errors across different deployments

## Configuration

### Environment Variables

The Sentry DSN is configured in the environment files:

```bash
# Server-side DSN
SENTRY_DSN=https://b2a1a136141a4da2ed51021eac73283e@o4509528461672448.ingest.de.sentry.io/4509528878678096

# Client-side DSN
NEXT_PUBLIC_SENTRY_DSN=https://b2a1a136141a4da2ed51021eac73283e@o4509528461672448.ingest.de.sentry.io/4509528878678096
```

### Next.js Configuration

Sentry is integrated with Next.js through the `next.config.js`:

```javascript
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "digital-linked",
    project: "rentitforward-web",
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);
```

## Implementation Details

### Configuration Files

1. **`instrumentation-client.ts`**: Client-side configuration for browser errors (Next.js 15+ recommended)
2. **`sentry.server.config.ts`**: Server-side configuration for API routes and SSR
3. **`sentry.edge.config.ts`**: Edge runtime configuration for middleware

### Key Features

- **Error Monitoring**: Automatic capture of unhandled errors
- **Performance Monitoring**: 10% sampling in production, 100% in development
- **Session Replay**: 10% sampling in production, 100% in development
- **User Context**: Automatically set when users authenticate
- **Environment**: Set to 'development' or 'production' based on NODE_ENV
- **Release Tracking**: Uses Vercel Git commit SHA or fallback version

### User Context Integration

User context can be managed through the Sentry utilities:

```typescript
import { setSentryUser, clearSentryUser } from '@/lib/sentry';

// Set user context
setSentryUser({
  id: user.id,
  email: user.email,
  name: user.name,
});

// Clear user context
clearSentryUser();
```

## Usage

### Automatic Error Capture

Most errors are automatically captured by Sentry. No additional code is required for:
- Unhandled JavaScript exceptions
- API route errors
- Server-side rendering errors
- Client-side React errors

### Manual Error Capture

For custom error handling:

```typescript
import { captureSentryException, captureSentryMessage } from '@/lib/sentry';

// Capture an exception
try {
  // Some operation that might fail
} catch (error) {
  captureSentryException(error, {
    context: 'additional context data',
    userId: user.id,
  });
}

// Capture a custom message
captureSentryMessage('User performed important action', 'info', {
  action: 'button_click',
  page: 'dashboard',
});
```

### Adding Breadcrumbs

Track user actions leading to errors:

```typescript
import { addSentryBreadcrumb } from '@/lib/sentry';

addSentryBreadcrumb('User navigated to profile', 'navigation', {
  from: 'dashboard',
  to: 'profile',
});
```

## Testing

### Test Page

Visit `/test-sentry` to test the Sentry integration:

1. **Send Test Error**: Triggers a test error to verify error capture
2. **Send Test Message**: Sends a custom message to Sentry
3. **Set User Context**: Sets test user context
4. **Clear User Context**: Clears user context
5. **Add Breadcrumb**: Adds a test breadcrumb
6. **Open Dashboard**: Direct link to Sentry dashboard

### Manual Testing

You can also test by calling undefined functions:

```javascript
// This will trigger an error that Sentry will capture
myUndefinedFunction();
```

### Verification

After testing, check your Sentry dashboard at:
https://rent-it-forward.sentry.io/insights/projects/rentitforward-web/

Look for events with tags:
- `platform:web`
- `app:rentitforward-web`
- `runtime:server` (for server-side errors)
- `runtime:browser` (for client-side errors)

## Dashboard Access

The Sentry project is configured for the email account: `rentitforward.app@gmail.com`

### Key Dashboard Sections

- **Issues**: View and manage error reports
- **Performance**: Monitor web performance metrics and Core Web Vitals
- **Releases**: Track errors across different deployments
- **Users**: View user-specific error reports
- **Replays**: Watch recorded user sessions

## Best Practices

### Error Handling

1. **Don't suppress all errors**: Let Sentry capture unhandled errors
2. **Add context**: Include relevant user and app state in error reports
3. **Use breadcrumbs**: Track user actions leading to errors
4. **Set user context**: Always associate errors with users when possible

### Performance

1. **Sampling rates**: Production uses 10% sampling to avoid performance impact
2. **Filter sensitive data**: Use `beforeSend` to filter out sensitive information
3. **Release tracking**: Tag releases to track error rates across deployments

### Privacy

1. **PII handling**: `sendDefaultPii: true` is enabled - ensure compliance with privacy policies
2. **Data filtering**: Review and filter sensitive data in the `beforeSend` callback
3. **User consent**: Ensure users consent to error reporting and session replay

## Troubleshooting

### Common Issues

1. **DSN not found**: Check environment variables and configuration files
2. **Events not appearing**: Verify network connectivity and DSN validity
3. **Performance impact**: Adjust sampling rates if needed
4. **Deprecation warning**: If you see a warning about `sentry.client.config.ts`, the configuration has been moved to `instrumentation-client.ts` (already fixed)

### Debug Mode

In development, Sentry logs initialization and events to the console. Check the console for:
- "Sentry initialized successfully"
- Event details in the `beforeSend` callback

### Support

For Sentry-specific issues, refer to:
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://rent-it-forward.sentry.io/)

## Security

- The DSN is safe to include in client-side code
- No sensitive data should be included in error reports
- User authentication tokens are not automatically included
- Review the `beforeSend` callback to ensure no sensitive data is transmitted
- Session replay is configured to mask text content and block media

## Monitoring Commands

### Check Recent Crashes
```bash
# Check Sentry dashboard for recent issues
# Filter by: Environment=production, Tags=platform:web
```

### Test Integration
```bash
# Visit the test page
https://your-domain.com/test-sentry
```

## Next Steps

1. **Monitor Dashboard**: Check for errors and performance issues
2. **Set Up Alerts**: Configure alerts for critical errors
3. **Analyze Performance**: Monitor Core Web Vitals and performance metrics
4. **User Context**: Integrate user context with authentication system
5. **Release Tracking**: Ensure proper release tagging for deployments

The Sentry integration is now fully functional and will provide comprehensive error monitoring and performance tracking for your web application!
