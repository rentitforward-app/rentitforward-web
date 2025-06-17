'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CheckCircle, ExternalLink, CreditCard, DollarSign, Shield } from 'lucide-react';

interface StripeConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  account_id?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  requirements?: string[];
}

interface StripeConnectSetupProps {
  onSetupComplete?: () => void;
  className?: string;
}

export const StripeConnectSetup = ({ onSetupComplete, className }: StripeConnectSetupProps) => {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Check current Stripe Connect status
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/payments/stripe/connect');
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
      } else {
        setError(data.error || 'Failed to check status');
      }
    } catch (err) {
      setError('Failed to check Stripe status');
    } finally {
      setLoading(false);
    }
  };

  // Create Stripe Connect account
  const createAccount = async () => {
    setActionLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_account' }),
      });

      const data = await response.json();

      if (response.ok) {
        // Account created, now create onboarding link
        await createOnboardingLink();
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      setError('Failed to create Stripe account');
    } finally {
      setActionLoading(false);
    }
  };

  // Create onboarding link and redirect
  const createOnboardingLink = async () => {
    setActionLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_onboarding_link' }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboarding_url;
      } else {
        setError(data.error || 'Failed to create onboarding link');
      }
    } catch (err) {
      setError('Failed to create onboarding link');
    } finally {
      setActionLoading(false);
    }
  };

  // Create login link for existing accounts
  const createLoginLink = async () => {
    setActionLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_login_link' }),
      });

      const data = await response.json();

      if (response.ok) {
        // Open in new tab
        window.open(data.login_url, '_blank');
      } else {
        setError(data.error || 'Failed to create login link');
      }
    } catch (err) {
      setError('Failed to create login link');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    // Handle return from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_return') === 'true') {
      // Refresh status after return
      setTimeout(() => {
        checkStatus();
        if (onSetupComplete) onSetupComplete();
      }, 1000);
    }
  }, [onSetupComplete]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <CreditCard className="w-6 h-6 text-primary mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Payment Setup
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!status?.connected ? (
          // Not connected - show setup
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Get paid for your rentals</h4>
              <p className="text-blue-700 text-sm mb-3">
                Set up secure payments through Stripe to receive money from renters.
              </p>
              <div className="space-y-2 text-sm text-blue-600">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Bank-level security
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fast payouts to your bank account
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  No monthly fees
                </div>
              </div>
            </div>

            <Button
              onClick={createAccount}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? 'Setting up...' : 'Set Up Payments'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By clicking "Set Up Payments", you'll be redirected to Stripe to complete your account setup.
            </p>
          </div>
        ) : !status.onboarding_complete ? (
          // Connected but onboarding incomplete
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Complete Your Setup</h4>
              <p className="text-yellow-700 text-sm mb-3">
                Your payment account is created but needs additional information to start receiving payments.
              </p>
              {status.requirements && status.requirements.length > 0 && (
                <div className="text-sm text-yellow-700">
                  <p className="font-medium mb-1">Required information:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {status.requirements.map((req, index) => (
                      <li key={index}>{req.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button
              onClick={createOnboardingLink}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? 'Loading...' : 'Complete Setup'}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          // Fully set up
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">Payment Setup Complete</h4>
              </div>
              <p className="text-green-700 text-sm">
                You're all set to receive payments from renters! Payments will be automatically 
                transferred to your bank account.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  status.charges_enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className={status.charges_enabled ? 'text-green-700' : 'text-gray-500'}>
                  Accept payments
                </span>
              </div>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  status.payouts_enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className={status.payouts_enabled ? 'text-green-700' : 'text-gray-500'}>
                  Receive payouts
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={createLoginLink}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? 'Loading...' : 'Manage Payment Account'}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StripeConnectSetup; 