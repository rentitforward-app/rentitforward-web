'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

export default function StripeConnectRefreshPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetryOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect/refresh-onboarding', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create onboarding link');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.onboarding_url;
    } catch (error) {
      console.error('Failed to retry onboarding:', error);
      setError(error instanceof Error ? error.message : 'Failed to retry onboarding');
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Complete Your Setup
          </h1>
          <p className="text-gray-600">
            Your Stripe Connect onboarding needs to be completed to receive payouts.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Why do I need to complete this?
          </h3>
          <ul className="text-sm text-yellow-700 text-left space-y-1">
            <li>• Verify your identity for secure payments</li>
            <li>• Enable automatic payout transfers</li>
            <li>• Comply with financial regulations</li>
            <li>• Create listings and receive earnings</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRetryOnboarding}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                Creating Link...
              </>
            ) : (
              <>
                Continue Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>

          <button
            onClick={handleGoToDashboard}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Skip for Now
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            You'll need to complete this setup before you can create listings or receive payouts.
          </p>
        </div>
      </div>
    </div>
  );
}



