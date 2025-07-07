'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowRight, RotateCcw, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const verifyEmailSchema = z.object({
  code: z.string().min(6, 'Verification code must be 6 characters').max(6, 'Verification code must be 6 characters'),
});

type VerifyEmailForm = z.infer<typeof verifyEmailSchema>;

function VerifyEmailForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<VerifyEmailForm>({
    resolver: zodResolver(verifyEmailSchema),
  });

  const code = watch('code');

  useEffect(() => {
    // Get email from session storage (set during signup)
    const signupEmail = sessionStorage.getItem('signup_email');
    if (signupEmail) {
      setEmail(signupEmail);
    } else {
      // If no email found, redirect to signup
      toast.error('Please sign up first');
      router.push('/signup');
    }
  }, [router]);

  useEffect(() => {
    // Handle cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async (data: VerifyEmailForm) => {
    if (!email) return;

    setIsLoading(true);
    try {
      const { data: verifyData, error } = await supabase.auth.verifyOtp({
        email,
        token: data.code,
        type: 'signup'
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (verifyData.user) {
        // Clear the stored email
        sessionStorage.removeItem('signup_email');
        
        toast.success('Email verified successfully!');
        
        // Add a brief delay to ensure the session is fully established
        setTimeout(() => {
          // Force a page refresh to ensure session is properly established
          // Use window.location.href instead of router.push to ensure proper session handling
          window.location.href = '/onboarding';
        }, 1000);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        // No emailRedirectTo option - this will send OTP code instead of link
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('New verification code sent!');
        setResendCooldown(60); // 60 second cooldown
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    const maskedName = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    return `${maskedName}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full">
        <Card className="p-8 shadow-lg border-0">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
              <Mail className="text-white text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-gray-600">
              We sent a verification code to
            </p>
            <p className="text-green-600 font-medium">
              {maskEmail(email)}
            </p>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification code
              </label>
              <input
                {...register('code')}
                type="text"
                maxLength={6}
                autoComplete="one-time-code"
                className={`block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-center text-xl font-mono tracking-widest ${
                  errors.code 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                } placeholder-gray-500 text-gray-900`}
                placeholder="000000"
                onChange={(e) => {
                  // Only allow numbers and update form state
                  const numericValue = e.target.value.replace(/[^0-9]/g, '');
                  setValue('code', numericValue);
                }}
              />
              {errors.code && (
                <p className="mt-2 text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !code || code.length !== 6}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-top-transparent" />
              ) : (
                <>
                  Verify Email
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Resend Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the code?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResendCode}
              disabled={isResending || resendCooldown > 0}
              className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-top-transparent mr-2" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resend verification code
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Check your spam folder if you don't see the code. The verification code expires in 60 minutes.
            </p>
          </div>

          {/* Back to Signup */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('signup_email');
                router.push('/signup');
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              ← Back to signup
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
} 