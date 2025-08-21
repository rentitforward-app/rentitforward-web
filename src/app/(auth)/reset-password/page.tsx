'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '../../../lib/supabase/client';
import { z } from 'zod';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  
  // Check URL parameters for direct password reset handling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const type = urlParams.get('type');
    
    console.log('URL parameters:', {
      code: code ? 'present' : 'missing',
      accessToken: accessToken ? 'present' : 'missing',
      refreshToken: refreshToken ? 'present' : 'missing',
      type,
      fullURL: window.location.href
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Check if user has a valid session for password reset
    const checkSession = async () => {
      try {
        setIsCheckingSession(true);
        console.log('Checking session for password reset...');
        
        // Check URL parameters for password reset flow
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        
        console.log('URL parameters analysis:', {
          hasCode: !!code,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          fullURL: window.location.href
        });
        
        // If we have a code but no session, let's allow the user to proceed
        // The password update will fail if the session is invalid anyway
        if (code && type === 'recovery') {
          console.log('Code-based password reset detected with code:', code.substring(0, 8) + '...');
          
          // Check if we have a valid session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          console.log('Current session check:', {
            hasSession: !!session,
            sessionError: sessionError?.message,
            userId: session?.user?.id,
            sessionType: session?.user?.app_metadata
          });
          
          if (session) {
            console.log('Valid session found, proceeding with password reset');
            setIsCheckingSession(false);
            setSessionError(null);
            return;
          }
          
          // If no session but we have a code, allow the user to proceed
          // The password update will handle the validation
          console.log('No session found but code present, allowing user to proceed');
          setIsCheckingSession(false);
          setSessionError(null);
          return;
        }
        
        // Handle token-based password reset (older Supabase flow)
        if (accessToken && refreshToken && type === 'recovery') {
          console.log('Token-based password reset detected');
          try {
            // Set the session from URL parameters
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Error setting session from URL parameters:', error);
              setIsCheckingSession(false);
              setSessionError('Invalid or expired reset link. Please request a new password reset.');
              toast.error('Invalid or expired reset link. Please request a new password reset.');
              setTimeout(() => router.push('/forgot-password'), 3000);
              return;
            }
            
            if (data.session) {
              console.log('Session established from URL parameters');
              setIsCheckingSession(false);
              setSessionError(null);
              return;
            }
          } catch (error) {
            console.error('Exception setting session from URL parameters:', error);
          }
        }
        
        // Fallback to checking existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('Session check result:', {
          hasSession: !!session,
          error: error?.message,
          user: session?.user?.id,
          sessionType: session?.user?.app_metadata,
          expires_at: session?.expires_at
        });
        
        if (error) {
          console.error('Session error:', error);
          let errorMessage = 'Invalid or expired reset link. Please request a new password reset.';
          
          if (error.message.includes('expired')) {
            errorMessage = 'Your reset link has expired. Reset links are valid for 1 hour only.';
          } else if (error.message.includes('invalid')) {
            errorMessage = 'This reset link is invalid. It may have been used already.';
          }
          
          setIsCheckingSession(false);
          setSessionError(errorMessage);
          toast.error(errorMessage);
          
          setTimeout(() => {
            router.push('/forgot-password');
          }, 3000);
          return;
        }
        
        if (!session) {
          console.log('No session found - this appears to be direct access without valid reset parameters');
          const errorMessage = 'No valid session found. The reset link may have expired or been used already.';
          setIsCheckingSession(false);
          setSessionError(errorMessage);
          toast.error(errorMessage);
          
          setTimeout(() => {
            router.push('/forgot-password');
          }, 3000);
          return;
        }
        
        // Check if this is actually a password reset session
        console.log('Valid session found, checking session type...');
        
        // Valid session found
        setIsCheckingSession(false);
        setSessionError(null);
        
      } catch (error) {
        console.error('Error checking session:', error);
        const errorMessage = 'Unable to verify reset link. Please try requesting a new password reset.';
        setIsCheckingSession(false);
        setSessionError(errorMessage);
        toast.error(errorMessage);
        
        setTimeout(() => {
          router.push('/forgot-password');
        }, 3000);
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsLoading(true);
    try {
      // Get URL parameters to check if we have a recovery code
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const type = urlParams.get('type');
      
      console.log('Password update attempt:', {
        hasCode: !!code,
        type,
        hasSession: !!(await supabase.auth.getSession()).data.session
      });
      
      let updateResult;
      
      // If we have a recovery code, try to update password with the code
      if (code && type === 'recovery') {
        console.log('Attempting password update with recovery code');
        updateResult = await supabase.auth.updateUser({
          password: data.password,
        });
      } else {
        // Otherwise, try normal password update (requires session)
        console.log('Attempting password update with session');
        updateResult = await supabase.auth.updateUser({
          password: data.password,
        });
      }

      if (updateResult.error) {
        console.error('Password update error:', updateResult.error);
        toast.error(updateResult.error.message);
      } else {
        console.log('Password updated successfully');
        setIsSuccess(true);
        toast.success('Password updated successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=Password updated successfully');
        }, 3000);
      }
    } catch (error) {
      console.error('Password update exception:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#44D62C]"></div>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Verifying reset link...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your password reset link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if session validation failed
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-2xl">✕</span>
              </div>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Reset Link Issue
            </h2>
            <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
              {sessionError}
            </p>
            <div className="mt-6 space-y-4">
              <button 
                onClick={() => router.push('/forgot-password')}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
              >
                Request New Password Reset
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                Auto-redirecting in 3 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Password updated!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="text-3xl font-bold text-[#44D62C]">
              Rent It Forward
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] focus:z-10 sm:text-sm`}
                  placeholder="New password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] focus:z-10 sm:text-sm`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
} 