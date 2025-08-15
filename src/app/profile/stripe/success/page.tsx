'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, DollarSign } from 'lucide-react';

export default function StripeConnectSuccessPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [accountStatus, setAccountStatus] = useState<any>(null);

  useEffect(() => {
    // Check account status after successful onboarding
    const checkAccountStatus = async () => {
      try {
        const response = await fetch('/api/stripe/connect/account-status');
        const data = await response.json();
        setAccountStatus(data);
      } catch (error) {
        console.error('Failed to check account status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Wait a moment for Stripe to process, then check status
    const timer = setTimeout(checkAccountStatus, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleCreateListing = () => {
    router.push('/host/create-listing');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Verifying Your Account
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your Stripe Connect setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {accountStatus?.onboarding_completed ? 'Account Setup Complete!' : 'Almost There!'}
          </h1>
          <p className="text-gray-600">
            {accountStatus?.onboarding_completed 
              ? 'You can now receive payouts for your rentals.'
              : 'Your Stripe account has been created. You may need to complete additional verification steps.'}
          </p>
        </div>

        {accountStatus?.onboarding_completed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-left">
                <p className="text-sm font-medium text-green-800">
                  Payouts Enabled
                </p>
                <p className="text-sm text-green-600">
                  You'll receive earnings after completed rentals
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {accountStatus?.onboarding_completed ? (
            <>
              <button
                onClick={handleCreateListing}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                Create Your First Listing
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <button
                onClick={handleContinue}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                You may receive an email with additional steps to complete your account verification.
              </p>
              <button
                onClick={handleContinue}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Continue to Dashboard
              </button>
            </>
          )}
        </div>

        {accountStatus && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Account Status</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="text-center">
                <div className={`h-2 w-2 rounded-full mx-auto mb-1 ${
                  accountStatus.onboarding_completed ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <p className="text-gray-600">Onboarding</p>
              </div>
              <div className="text-center">
                <div className={`h-2 w-2 rounded-full mx-auto mb-1 ${
                  accountStatus.payouts_enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <p className="text-gray-600">Payouts</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
