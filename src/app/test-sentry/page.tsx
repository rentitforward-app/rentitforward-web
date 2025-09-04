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

export default function TestSentryPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testError = () => {
    try {
      addSentryBreadcrumb('Testing Sentry error capture', 'test');
      throw new Error('This is a test error for Sentry integration verification');
    } catch (error) {
      captureSentryException(error as Error, { 
        test: true, 
        component: 'TestSentryPage',
        timestamp: new Date().toISOString()
      });
      addResult('Test error sent to Sentry');
    }
  };

  const testMessage = () => {
    addSentryBreadcrumb('Testing Sentry message capture', 'test');
    captureSentryMessage(
      'This is a test message for Sentry integration', 
      'info', 
      { 
        test: true, 
        component: 'TestSentryPage',
        timestamp: new Date().toISOString()
      }
    );
    addResult('Test message sent to Sentry');
  };

  const testUserContext = () => {
    setSentryUser({
      id: 'test-user-123',
      email: 'test@rentitforward.com.au',
      name: 'Test User'
    });
    addResult('User context set in Sentry');
  };

  const clearUserContext = () => {
    clearSentryUser();
    addResult('User context cleared from Sentry');
  };

  const testBreadcrumb = () => {
    addSentryBreadcrumb('Test breadcrumb added', 'user_action', {
      action: 'button_click',
      page: 'test-sentry',
      timestamp: new Date().toISOString()
    });
    addResult('Breadcrumb added to Sentry');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sentry Integration Test
          </h1>
          <p className="text-gray-600">
            Test the Sentry error monitoring and performance tracking integration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Testing</CardTitle>
              <CardDescription>
                Test error capture and reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testError}
                variant="destructive"
                className="w-full"
              >
                Send Test Error
              </Button>
              <Button 
                onClick={testMessage}
                variant="outline"
                className="w-full"
              >
                Send Test Message
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Context</CardTitle>
              <CardDescription>
                Test user context management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testUserContext}
                variant="default"
                className="w-full"
              >
                Set User Context
              </Button>
              <Button 
                onClick={clearUserContext}
                variant="outline"
                className="w-full"
              >
                Clear User Context
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Breadcrumbs</CardTitle>
              <CardDescription>
                Test breadcrumb tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={testBreadcrumb}
                variant="secondary"
                className="w-full"
              >
                Add Test Breadcrumb
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Access</CardTitle>
              <CardDescription>
                View your Sentry dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.open('https://rent-it-forward.sentry.io/insights/projects/rentitforward-web/', '_blank')}
                variant="outline"
                className="w-full"
              >
                Open Sentry Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Recent test actions and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg text-sm font-mono"
                  >
                    {result}
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => setTestResults([])}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Clear Results
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Verification Steps</CardTitle>
            <CardDescription>
              How to verify Sentry is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click the test buttons above to send events to Sentry</li>
              <li>Open the Sentry dashboard using the button above</li>
              <li>Check the "Issues" tab for error reports</li>
              <li>Check the "Performance" tab for performance data</li>
              <li>Look for events with tags: <code className="bg-gray-100 px-1 rounded">platform:web</code> and <code className="bg-gray-100 px-1 rounded">app:rentitforward-web</code></li>
              <li>Verify user context and breadcrumbs are being captured</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}