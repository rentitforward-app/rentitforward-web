import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            There was a problem with your authentication link. This could be because:
          </p>
          <ul className="mt-4 text-sm text-gray-600 text-left space-y-2">
            <li>• The link has expired</li>
            <li>• The link has already been used</li>
            <li>• The link is invalid or corrupted</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <Link
                          href="/signup"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
          >
            Create new account
          </Link>
          
          <Link
            href="/login"
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
          >
            Sign in to existing account
          </Link>
          
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#44D62C] hover:text-[#3AB827]"
            >
              Reset your password
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 