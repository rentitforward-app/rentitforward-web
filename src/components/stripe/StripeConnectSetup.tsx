'use client';

import { useState } from 'react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { 
  CreditCard, 
  DollarSign, 
  Shield, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface StripeConnectSetupProps {
  onComplete?: () => void;
  showTitle?: boolean;
  variant?: 'card' | 'inline' | 'modal';
  requiredForAction?: string; // e.g., "create listings"
}

export default function StripeConnectSetup({ 
  onComplete, 
  showTitle = true, 
  variant = 'card',
  requiredForAction = 'receive payouts'
}: StripeConnectSetupProps) {
  const { status, isLoading, error, createAccount, refreshOnboarding } = useStripeConnect();
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCreateAccount = async () => {
    setIsCreating(true);
    const onboardingUrl = await createAccount('individual');
    
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
    } else {
      setIsCreating(false);
    }
  };

  const handleRefreshOnboarding = async () => {
    setIsRefreshing(true);
    const onboardingUrl = await refreshOnboarding();
    
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
    } else {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={variant === 'card' ? 'bg-white rounded-lg shadow p-6' : 'p-4'}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // If account is fully set up
  if (status?.has_account && status?.onboarding_completed && status?.payouts_enabled) {
    if (variant === 'inline') {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <CheckCircle className="h-4 w-4 mr-1" />
          Stripe account connected
        </div>
      );
    }

    return (
      <div className={variant === 'card' ? 'bg-green-50 border border-green-200 rounded-lg p-4' : 'p-4'}>
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-green-800">
              Stripe Account Connected
            </h3>
            <p className="text-sm text-green-600">
              You can receive payouts for your rentals
            </p>
          </div>
        </div>
      </div>
    );
  }

  const containerClass = variant === 'card' 
    ? 'bg-white rounded-lg shadow-lg p-6'
    : variant === 'modal'
    ? 'p-6'
    : 'p-4 border border-gray-200 rounded-lg';

  return (
    <div className={containerClass}>
      {showTitle && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connect Your Stripe Account
          </h2>
          <p className="text-gray-600">
            Set up secure payments to {requiredForAction}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-900">Secure</h3>
          <p className="text-xs text-gray-600">Bank-level security</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-900">Fast Payouts</h3>
          <p className="text-xs text-gray-600">Get paid quickly</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <CreditCard className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-900">Global</h3>
          <p className="text-xs text-gray-600">Accept all cards</p>
        </div>
      </div>

      {/* Current Status */}
      {status?.has_account && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Complete Your Account Setup
              </h3>
              <p className="text-sm text-yellow-700">
                {!status.onboarding_completed 
                  ? 'Finish your account verification to receive payouts'
                  : 'Account verification in progress'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!status?.has_account ? (
          <button
            onClick={handleCreateAccount}
            disabled={isCreating}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCreating ? (
              <>
                <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                Creating Account...
              </>
            ) : (
              <>
                Connect with Stripe
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        ) : !status.onboarding_completed ? (
          <button
            onClick={handleRefreshOnboarding}
            disabled={isRefreshing}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                Loading...
              </>
            ) : (
              <>
                Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <div className="text-center text-sm text-gray-600">
            <p>Account setup is in progress. You'll receive an email when it's complete.</p>
          </div>
        )}
      </div>

      {/* Account Status Indicators */}
      {status?.has_account && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Setup Progress</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className={`h-3 w-3 rounded-full mx-auto mb-1 ${
                status.has_account ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <p className="text-xs text-gray-600">Account</p>
            </div>
            <div className="text-center">
              <div className={`h-3 w-3 rounded-full mx-auto mb-1 ${
                status.onboarding_completed ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <p className="text-xs text-gray-600">Verification</p>
            </div>
            <div className="text-center">
              <div className={`h-3 w-3 rounded-full mx-auto mb-1 ${
                status.payouts_enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <p className="text-xs text-gray-600">Payouts</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        Powered by{' '}
        <a 
          href="https://stripe.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
        >
          Stripe Connect
        </a>
      </div>
    </div>
  );
}



