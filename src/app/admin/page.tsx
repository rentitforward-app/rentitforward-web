'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';

export default function AdminRootPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAdmin, loading, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
} 