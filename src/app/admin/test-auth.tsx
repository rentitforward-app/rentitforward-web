'use client';

import { useAuth } from '@/hooks/use-auth';
import { useAdmin } from '@/hooks/use-admin';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminAuthTest() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, adminUser, loading: adminLoading } = useAdmin();
  const [profileData, setProfileData] = useState<any>(null);
  const [profileError, setProfileError] = useState<any>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      // Direct profile fetch to see what's happening
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setProfileData(data);
          setProfileError(error);
        } catch (err) {
          setProfileError(err);
        }
      };
      
      fetchProfile();
    }
  }, [user, supabase]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Authentication Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Auth Status</h2>
          <p>Auth Loading: {authLoading.toString()}</p>
          <p>User ID: {user?.id || 'null'}</p>
          <p>User Email: {user?.email || 'null'}</p>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-bold mb-2">Admin Hook Status</h2>
          <p>Admin Loading: {adminLoading.toString()}</p>
          <p>Is Admin: {isAdmin.toString()}</p>
          <p>Admin User: {JSON.stringify(adminUser, null, 2)}</p>
        </div>

        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-bold mb-2">Direct Profile Fetch</h2>
          <p>Profile Data: {JSON.stringify(profileData, null, 2)}</p>
          <p>Profile Error: {JSON.stringify(profileError, null, 2)}</p>
        </div>
      </div>
    </div>
  );
} 