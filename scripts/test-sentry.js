const Sentry = require('@sentry/node');
require('dotenv').config({ path: '.env.local' });

const SENTRY_DSN = process.env.SENTRY_DSN;

if (!SENTRY_DSN) {
  console.error('❌ SENTRY_DSN not found in environment variables');
  process.exit(1);
}

console.log('🔧 Initializing Sentry...');

Sentry.init({
  dsn: SENTRY_DSN,
  environment: 'test-script',
  tracesSampleRate: 1.0,
  debug: true,
});

console.log('✅ Sentry initialized successfully');

// Test error capture
console.log('📤 Sending test error...');
try {
  throw new Error('This is a test error from the Sentry Node.js script for web app!');
} catch (error) {
  Sentry.captureException(error);
}

// Test message capture
console.log('📤 Sending test message...');
Sentry.captureMessage('This is a test message from the Sentry Node.js script for web app!', 'info');

// Test user context
console.log('👤 Setting test user context...');
Sentry.setUser({
  id: 'test-user-web-123',
  email: 'test@rentitforward.com.au',
  username: 'Test User Web',
});

// Test custom tags
console.log('🏷️ Setting custom tags...');
Sentry.setTags({
  platform: 'web',
  app: 'rentitforward-web',
  test: 'true',
});

// Test custom context
console.log('📋 Setting custom context...');
Sentry.setContext('test_context', {
  script: 'test-sentry.js',
  timestamp: new Date().toISOString(),
  environment: 'test',
});

// Flush and close
console.log('🔄 Flushing Sentry events...');
Sentry.flush(2000).then(() => {
  console.log('✅ All events sent to Sentry successfully!');
  console.log('🌐 Check your dashboard at: https://rent-it-forward.sentry.io/insights/projects/rentitforward-web/');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error flushing Sentry events:', error);
  process.exit(1);
});
