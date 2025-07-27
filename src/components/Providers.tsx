'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { OneSignalProvider } from './OneSignalProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <OneSignalProvider>
        {children}
      </OneSignalProvider>
    </QueryClientProvider>
  );
} 