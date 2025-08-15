'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Shield, 
  FileText, 
  RefreshCw,
  AlertTriangle,
  Camera,
  Lock,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface IdentityVerificationStatus {
  status: 'not_started' | 'requires_input' | 'processing' | 'verified' | 'canceled';
  verification?: {
    id: string;
    stripe_verification_session_id: string;
    status: string;
    verified_outputs?: any;
    last_error?: any;
    verified_at?: string;
    created_at: string;
    updated_at: string;
  };
  stripe_verification?: {
    status: string;
    verified_outputs?: any;
    last_error?: any;
    created: number;
  };
}

interface IdentityVerificationProps {
  className?: string;
  onVerificationComplete?: () => void;
}

export const IdentityVerification = ({ 
  className, 
  onVerificationComplete 
}: IdentityVerificationProps) => {
  const [status, setStatus] = useState<IdentityVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Stripe.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Fetch verification status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/identity/verification-session');
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
      } else {
        console.error('API Error:', data);
        toast.error(data.error || 'Failed to fetch verification status');
      }
    } catch (error) {
      console.error('Network Error:', error);
      toast.error('Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Start identity verification
  const startVerification = async () => {
    setActionLoading(true);
    try {
      // Create verification session
      const response = await fetch('/api/identity/verification-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create verification session');
      }

      // Initialize Stripe and show verification modal
      if (!(window as any).Stripe) {
        throw new Error('Stripe.js not loaded. Please refresh the page and try again.');
      }

      const stripe = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      
      const result = await stripe.verifyIdentity(data.client_secret);
      
      if (result.error) {
        console.error('Stripe Identity error:', result.error);
        toast.error(result.error.message || 'Verification failed');
      } else {
        toast.success('Identity verification submitted successfully!');
        await fetchStatus(); // Refresh status
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      }
    } catch (error: any) {
      console.error('Error starting verification:', error);
      toast.error(error.message || 'Failed to start verification');
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="success" className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="warning" className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case 'requires_input':
        return (
          <Badge variant="destructive" className="flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            Action Required
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="secondary" className="flex items-center">
            <XCircle className="w-3 h-3 mr-1" />
            Canceled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Not Started
          </Badge>
        );
    }
  };

  // Get verification details
  const getVerificationDetails = () => {
    if (!status?.stripe_verification) return null;

    const verifiedOutputs = status.stripe_verification.verified_outputs;
    if (!verifiedOutputs) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-gray-900">Verified Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {verifiedOutputs.id_number && (
            <div>
              <span className="font-medium text-gray-700">ID Number:</span>
              <span className="ml-2 text-gray-600">•••••{verifiedOutputs.id_number.slice(-4)}</span>
            </div>
          )}
          {verifiedOutputs.name && (
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <span className="ml-2 text-gray-600">{verifiedOutputs.name}</span>
            </div>
          )}
          {verifiedOutputs.date_of_birth && (
            <div>
              <span className="font-medium text-gray-700">Date of Birth:</span>
              <span className="ml-2 text-gray-600">
                {new Date(verifiedOutputs.date_of_birth * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
          {verifiedOutputs.address && (
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Address:</span>
              <span className="ml-2 text-gray-600">
                {[
                  verifiedOutputs.address.line1,
                  verifiedOutputs.address.city,
                  verifiedOutputs.address.state,
                  verifiedOutputs.address.postal_code,
                  verifiedOutputs.address.country
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Get error details
  const getErrorDetails = () => {
    if (!status?.stripe_verification?.last_error) return null;

    const error = status.stripe_verification.last_error;
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center mb-2">
          <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
          <span className="font-medium text-red-800">Verification Issue</span>
        </div>
        <p className="text-red-700 text-sm">{error.reason || 'Verification failed. Please try again.'}</p>
        {error.requirement && (
          <p className="text-red-600 text-sm mt-1">
            Requirement: {error.requirement.replace(/_/g, ' ')}
          </p>
        )}
      </div>
    );
  };

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
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Identity Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Verification Status</p>
            <p className="text-sm text-gray-600">
              Verify your identity to rent items on Rent It Forward
            </p>
          </div>
          {getStatusBadge(status?.status || 'not_started')}
        </div>

        {/* Error Details */}
        {status?.status === 'requires_input' && getErrorDetails()}

        {/* Verification Details */}
        {status?.status === 'verified' && getVerificationDetails()}

        {/* Processing Message */}
        {status?.status === 'processing' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-blue-500 mr-2" />
              <span className="font-medium text-blue-800">Processing Verification</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Your identity verification is being processed. This usually takes a few minutes.
            </p>
          </div>
        )}

        {/* What's Required */}
        {(status?.status === 'not_started' || status?.status === 'requires_input') && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              What You'll Need
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <Camera className="w-4 h-4 mr-2 text-gray-400" />
                A clear photo of a government-issued ID (passport, driver's license, or national ID)
              </li>
              <li className="flex items-center">
                <Camera className="w-4 h-4 mr-2 text-gray-400" />
                A live selfie for identity matching
              </li>
              <li className="flex items-center">
                <Lock className="w-4 h-4 mr-2 text-gray-400" />
                Your information will be securely processed by Stripe
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {(status?.status === 'not_started' || status?.status === 'requires_input') && (
            <Button 
              onClick={startVerification}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {status?.status === 'requires_input' ? 'Retry Verification' : 'Start Verification'}
            </Button>
          )}

          <Button 
            variant="outline" 
            onClick={fetchStatus}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 border-t pt-4">
          <p>
            Identity verification is powered by Stripe Identity and helps keep our community safe. 
            Your personal information is encrypted and securely processed in compliance with data protection regulations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
