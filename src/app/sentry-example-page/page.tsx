'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  captureSentryException, 
  captureSentryMessage, 
  addSentryBreadcrumb,
  setSentryUser,
  clearSentryUser 
} from '@/lib/sentry';

export default function SentryExamplePage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test if Sentry functions are available
  const testSentryAvailability = () => {
    console.log('Testing Sentry availability...');
    console.log('captureSentryException:', typeof captureSentryException);
    console.log('captureSentryMessage:', typeof captureSentryMessage);
    console.log('addSentryBreadcrumb:', typeof addSentryBreadcrumb);
    console.log('setSentryUser:', typeof setSentryUser);
    console.log('clearSentryUser:', typeof clearSentryUser);
    
    // Test if Sentry is available globally
    console.log('Global Sentry:', typeof (window as any).Sentry);
    console.log('NEXT_PUBLIC_SENTRY_DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN);
    
    addResult('Sentry functions availability checked (see console)');
  };

  const testError = () => {
    try {
      console.log('Testing error function...');
      addSentryBreadcrumb('User clicked test error button', 'user_action', { 
        page: 'sentry-example-page',
        action: 'test_error' 
      });
      
      // This will trigger an error
      (window as any).myUndefinedFunction();
    } catch (error) {
      console.log('Error caught:', error);
      captureSentryException(error as Error, { 
        page: 'sentry-example-page',
        action: 'test_error',
        error_type: 'undefined_function' 
      });
      addResult('Test error sent to Sentry');
    }
  };

  const testMessage = () => {
    console.log('Testing message function...');
    addSentryBreadcrumb('User clicked test message button', 'user_action', { 
      page: 'sentry-example-page',
      action: 'test_message' 
    });
    
    captureSentryMessage('This is a test message from the Sentry example page', 'info', {
      page: 'sentry-example-page',
      action: 'test_message',
      timestamp: new Date().toISOString()
    });
    addResult('Test message sent to Sentry');
  };

  const testUserContext = () => {
    console.log('Testing user context function...');
    addSentryBreadcrumb('User clicked set user context button', 'user_action', { 
      page: 'sentry-example-page',
      action: 'set_user_context' 
    });
    
    setSentryUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User'
    });
    addResult('User context set in Sentry');
  };

  const clearUserContext = () => {
    addSentryBreadcrumb('User clicked clear user context button', 'user_action', { 
      page: 'sentry-example-page',
      action: 'clear_user_context' 
    });
    
    clearSentryUser();
    addResult('User context cleared from Sentry');
  };

  const addBreadcrumb = () => {
    addSentryBreadcrumb('Custom breadcrumb added', 'custom', { 
      page: 'sentry-example-page',
      action: 'add_breadcrumb',
      timestamp: new Date().toISOString()
    });
    addResult('Breadcrumb added to Sentry');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Sentry Example Page
          </h1>
          <p className="text-lg text-gray-600">
            This page demonstrates Sentry error tracking and monitoring capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Error Testing</CardTitle>
              <CardDescription>
                Test error capturing and reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testSentryAvailability}
                className="w-full bg-gray-600 hover:bg-gray-700"
              >
                Test Sentry Availability
              </Button>
              <Button 
                onClick={testError}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Trigger Test Error
              </Button>
              <Button 
                onClick={testMessage}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Send Test Message
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Context</CardTitle>
              <CardDescription>
                Test user context and breadcrumbs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testUserContext}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Set User Context
              </Button>
              <Button 
                onClick={clearUserContext}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                Clear User Context
              </Button>
              <Button 
                onClick={addBreadcrumb}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Add Breadcrumb
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Recent test actions and their results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No test results yet. Click the buttons above to test Sentry integration.
              </p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="bg-gray-100 rounded-lg p-3 text-sm font-mono"
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
            {testResults.length > 0 && (
              <div className="mt-4 text-center">
                <Button 
                  onClick={clearResults}
                  variant="outline"
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  Clear Results
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Check your Sentry dashboard to see the captured events:
          </p>
          <a 
            href="https://rent-it-forward.sentry.io/insights/projects/rentitforward-web/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Open Sentry Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}