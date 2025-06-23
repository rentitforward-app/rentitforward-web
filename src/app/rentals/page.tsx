'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RentalsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new bookings page
    router.replace('/bookings');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to My Bookings...</p>
      </div>
    </div>
  );
} 