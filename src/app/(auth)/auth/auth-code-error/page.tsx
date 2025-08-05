import Link from 'next/link';
import { AlertCircle, Clock, X, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

function AuthCodeErrorContent({ searchParams }: { searchParams: { error?: string } }) {
  const errorType = searchParams?.error || 'unknown';
  
  const getErrorInfo = (errorType: string) => {
    switch (errorType) {
      case 'expired':
        return {
          icon: <Clock className="h-16 w-16 text-yellow-500" />,
          title: 'Link Expired',
          message: 'Your reset link has expired. Reset links are only valid for 1 hour for security reasons.',
          details: [
            'The link was sent more than 1 hour ago',
            'This is a security measure to protect your account',
            'You need to request a new password reset'
          ]
        };
      case 'invalid':
        return {
          icon: <X className="h-16 w-16 text-red-500" />,
          title: 'Invalid Link',
          message: 'This reset link is no longer valid. It may have been used already or corrupted.',
          details: [
            'The link has already been used to reset your password',
            'The link may have been corrupted when copied',
            'Someone else may have used this link'
          ]
        };
      case 'no-code':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-orange-500" />,
          title: 'Incomplete Link',
          message: 'The reset link appears to be incomplete or missing required information.',
          details: [
            'The link may have been truncated when copied',
            'Try copying the entire link from your email',
            'Check if your email client broke the link across multiple lines'
          ]
        };
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-red-500" />,
          title: 'Authentication Error',
          message: 'There was a problem with your authentication link.',
          details: [
            'The link has expired (links are valid for 1 hour)',
            'The link has already been used',
            'The link is invalid or corrupted'
          ]
        };
    }
  };

  const errorInfo = getErrorInfo(errorType);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            {errorInfo.icon}
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorInfo.message}
          </p>
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">Common causes:</p>
            <ul className="text-sm text-gray-600 text-left space-y-1">
              {errorInfo.details.map((detail, index) => (
                <li key={index}>• {detail}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/forgot-password"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
          >
            Request new password reset
          </Link>
          
          <Link
            href="/login"
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
          >
            Back to login
          </Link>
          
          <div className="text-center">
            <Link
              href="/signup"
              className="text-sm font-medium text-[#44D62C] hover:text-[#3AB827]"
            >
              Create new account instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    }>
      <AuthCodeErrorContent searchParams={searchParams} />
    </Suspense>
  );
} 