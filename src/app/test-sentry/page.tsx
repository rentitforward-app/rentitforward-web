'use client';

import * as Sentry from '@sentry/nextjs';

export default function TestSentryPage() {
  const testClientError = () => {
    throw new Error('Test client-side error from Rent It Forward Web App');
  };

  const testSentryCapture = () => {
    Sentry.captureException(new Error('Test Sentry.captureException from Web App'));
    alert('Test error sent to Sentry! Check your dashboard.');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🧪 Sentry Test Page</h1>
      <p>Use these buttons to test your Sentry integration:</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button
          onClick={testClientError}
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test Uncaught Error
        </button>
        
        <button
          onClick={testSentryCapture}
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#4444ff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test Sentry Capture
        </button>
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>📊 Your Sentry Dashboard:</h3>
        <p>
          <a 
            href="https://digital-linked.sentry.io/projects/rentitforward-web/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#0066cc' }}
          >
            View Web Project Issues →
          </a>
        </p>
      </div>
    </div>
  );
} 