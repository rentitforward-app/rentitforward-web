'use client';

import { useState, useEffect } from 'react';

interface StripeTestResult {
  success: boolean;
  configured: boolean;
  account_id?: string;
  account_type?: string;
  business_profile?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  keys_configured: {
    secret_key: string;
    publishable_key: string;
    webhook_secret: string;
  };
  connect_ready?: boolean;
  error?: string;
}

export default function TestStripePage() {
  const [testResult, setTestResult] = useState<StripeTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runStripeTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-stripe');
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        configured: false,
        error: 'Failed to connect to test endpoint',
        keys_configured: {
          secret_key: '❌ Unknown',
          publishable_key: '❌ Unknown',
          webhook_secret: '❌ Unknown',
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runStripeTest();
  }, []);

  const getStatusIcon = (status: boolean) => status ? '✅' : '❌';
  const getStatusColor = (status: boolean) => status ? 'text-green-600' : 'text-red-600';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Stripe Connect Configuration Test</h1>
        <button 
          onClick={runStripeTest} 
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Refresh Test'}
        </button>
      </div>

      {testResult && (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Overall Status</h2>
            <div className={`text-2xl font-bold ${getStatusColor(testResult.success)}`}>
              {testResult.success ? '✅ Stripe Connect Ready' : '❌ Configuration Issues'}
            </div>
            {testResult.error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                <strong>Error:</strong> {testResult.error}
              </div>
            )}
          </div>

          {/* Environment Variables */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Secret Key (STRIPE_SECRET_KEY):</span>
                <span className={testResult.keys_configured.secret_key.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {testResult.keys_configured.secret_key}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Publishable Key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY):</span>
                <span className={testResult.keys_configured.publishable_key.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {testResult.keys_configured.publishable_key}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Webhook Secret (STRIPE_WEBHOOK_SECRET):</span>
                <span className={testResult.keys_configured.webhook_secret.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {testResult.keys_configured.webhook_secret}
                </span>
              </div>
            </div>
          </div>

          {/* Stripe Account Details */}
          {testResult.success && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Stripe Account Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Account ID:</span>
                  <span className="font-mono text-sm">{testResult.account_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Account Type:</span>
                  <span>{testResult.account_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Business Profile:</span>
                  <span>{testResult.business_profile}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Charges Enabled:</span>
                  <span className={getStatusColor(testResult.charges_enabled || false)}>
                    {getStatusIcon(testResult.charges_enabled || false)} {testResult.charges_enabled ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Payouts Enabled:</span>
                  <span className={getStatusColor(testResult.payouts_enabled || false)}>
                    {getStatusIcon(testResult.payouts_enabled || false)} {testResult.payouts_enabled ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Details Submitted:</span>
                  <span className={getStatusColor(testResult.details_submitted || false)}>
                    {getStatusIcon(testResult.details_submitted || false)} {testResult.details_submitted ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Connect Ready:</span>
                  <span className={getStatusColor(testResult.connect_ready || false)}>
                    {getStatusIcon(testResult.connect_ready || false)} {testResult.connect_ready ? 'Ready for Marketplace' : 'Setup Required'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">1. Configure Environment Variables</h3>
                <p className="text-sm text-gray-600 mb-2">Update your <code>.env.local</code> file with your Stripe keys:</p>
                <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                  STRIPE_SECRET_KEY=sk_test_your_secret_key_here<br/>
                  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here<br/>
                  STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg">2. Enable Stripe Connect</h3>
                <p className="text-sm text-gray-600">
                  Go to <a href="https://dashboard.stripe.com/connect/overview" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Stripe Connect Dashboard
                  </a> and enable Express accounts for your marketplace.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg">3. Set Up Webhook</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Create a webhook endpoint at <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Stripe Webhooks
                  </a>:
                </p>
                <div className="bg-gray-100 p-3 rounded text-sm">
                  <strong>URL:</strong> http://localhost:3000/api/payments/stripe/webhook<br/>
                  <strong>Events:</strong> account.updated, payment_intent.succeeded, payment_intent.payment_failed, transfer.created, payout.paid
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg">4. Test the Integration</h3>
                <p className="text-sm text-gray-600">
                  Once configured, visit <a href="/admin/payment-releases" className="text-blue-600 hover:underline">
                    /admin/payment-releases
                  </a> to test the payment release system.
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          {testResult.success && testResult.connect_ready && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-green-800">🎉 Ready to Test!</h2>
              <div className="space-y-2 text-green-700">
                <p>✅ Stripe Connect is properly configured</p>
                <p>✅ All environment variables are set</p>
                <p>✅ Your account is ready for marketplace payments</p>
              </div>
              <div className="mt-4 space-x-4">
                <a href="/admin/payment-releases" className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Test Payment Releases
                </a>
                <a href="/test-pricing" className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  Test Pricing Logic
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 