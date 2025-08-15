'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Lock,
  ArrowRight,
  X
} from 'lucide-react';
import Link from 'next/link';

interface IdentityVerificationGateProps {
  children: React.ReactNode;
  action: 'rent' | 'book' | 'list'; // What action requires verification
  onVerificationRequired?: () => void;
  className?: string;
}

interface VerificationStatus {
  status: 'not_started' | 'requires_input' | 'processing' | 'verified' | 'canceled';
  isVerified: boolean;
}

export const IdentityVerificationGate = ({
  children,
  action,
  onVerificationRequired,
  className
}: IdentityVerificationGateProps) => {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/identity/verification-session');
      const data = await response.json();
      
      if (response.ok) {
        setVerificationStatus({
          status: data.status,
          isVerified: data.status === 'verified'
        });
      } else {
        console.error('Failed to fetch verification status:', data);
        setVerificationStatus({
          status: 'not_started',
          isVerified: false
        });
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setVerificationStatus({
        status: 'not_started',
        isVerified: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!loading && verificationStatus && !verificationStatus.isVerified) {
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
      if (onVerificationRequired) {
        onVerificationRequired();
      }
    }
  };

  const getActionText = () => {
    switch (action) {
      case 'rent':
        return 'rent this item';
      case 'book':
        return 'create a booking';
      case 'list':
        return 'list items for rent';
      default:
        return 'perform this action';
    }
  };

  const getStatusBadge = () => {
    if (!verificationStatus) return null;

    switch (verificationStatus.status) {
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
            <Shield className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Not Verified
          </Badge>
        );
    }
  };

  // If loading, show children normally
  if (loading) {
    return <div className={className}>{children}</div>;
  }

  // If verified, show children normally
  if (verificationStatus?.isVerified) {
    return <div className={className}>{children}</div>;
  }

  // If not verified, wrap children with click handler and show modal when needed
  return (
    <div className={className}>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>

      {/* Verification Required Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-500" />
                Identity Verification Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Status:</span>
                {getStatusBadge()}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Lock className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 text-sm">
                      Verification needed to {getActionText()}
                    </p>
                    <p className="text-blue-700 text-sm mt-1">
                      For security and trust, we require identity verification before you can rent items on our platform.
                    </p>
                  </div>
                </div>
              </div>

              {verificationStatus?.status === 'processing' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Your identity verification is currently being processed. This usually takes a few minutes.
                  </p>
                </div>
              )}

              {verificationStatus?.status === 'requires_input' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">
                    Your identity verification requires attention. Please complete the verification process.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">What happens during verification:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Take a photo of your government-issued ID</li>
                  <li>• Take a live selfie for identity matching</li>
                  <li>• Your information is securely processed by Stripe</li>
                  <li>• Verification typically completes in a few minutes</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <Link href="/settings" className="flex-1">
                  <Button className="w-full">
                    {verificationStatus?.status === 'requires_input' ? 'Complete Verification' : 'Start Verification'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Verification is a one-time process to help keep our community safe and trusted.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
