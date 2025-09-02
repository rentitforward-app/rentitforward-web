'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

export default function AuthCodeErrorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRetry = () => {
    router.push('/forgot-password');
  };

  const handleGoBack = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          
          <p className="text-gray-600 mb-6">
            The password reset link you clicked is invalid or has expired. This can happen if:
          </p>
          
          <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
            <li>• The link has already been used</li>
            <li>• The link has expired (links are valid for 1 hour)</li>
            <li>• The link was copied incorrectly</li>
            <li>• You're using a different email address</li>
          </ul>
          
          <div className="space-y-3">
            <Button
              onClick={handleRetry}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Request New Password Reset
            </Button>
            
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

