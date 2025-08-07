'use client';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface DashboardWrapperProps {
  children: React.ReactNode;
}

export default function DashboardWrapper({ children }: DashboardWrapperProps) {
  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto p-6">
        {children}
      </div>
    </AuthenticatedLayout>
  );
}
