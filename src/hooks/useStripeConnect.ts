import { useState, useEffect } from 'react';

interface StripeConnectStatus {
  has_account: boolean;
  account_id?: string;
  onboarding_completed: boolean;
  payouts_enabled: boolean;
  charges_enabled: boolean;
  requirements?: any;
  business_profile?: any;
}

interface UseStripeConnectResult {
  status: StripeConnectStatus | null;
  isLoading: boolean;
  error: string | null;
  createAccount: (businessType?: string) => Promise<string | null>;
  refreshOnboarding: () => Promise<string | null>;
  refetch: () => Promise<void>;
}

export function useStripeConnect(): UseStripeConnectResult {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/stripe/connect/account-status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch account status');
      }

      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch Stripe Connect status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (businessType: string = 'individual'): Promise<string | null> => {
    try {
      setError(null);
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_type: businessType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Update status to include new account
      setStatus(prev => prev ? {
        ...prev,
        has_account: true,
        account_id: data.account_id,
        onboarding_completed: false,
        payouts_enabled: false,
        charges_enabled: false,
      } : null);

      return data.onboarding_url;
    } catch (err) {
      console.error('Failed to create Stripe Connect account:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
      return null;
    }
  };

  const refreshOnboarding = async (): Promise<string | null> => {
    try {
      setError(null);
      const response = await fetch('/api/stripe/connect/refresh-onboarding', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh onboarding');
      }

      return data.onboarding_url;
    } catch (err) {
      console.error('Failed to refresh onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh onboarding');
      return null;
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    await fetchStatus();
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    status,
    isLoading,
    error,
    createAccount,
    refreshOnboarding,
    refetch,
  };
}



