import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't check admin status while auth is still loading
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const checkAdminStatus = async () => {
    // If auth is still loading, keep admin loading as well
    if (authLoading) {
      console.log('useAdmin: Auth still loading, keeping admin loading');
      setLoading(true);
      return;
    }

    if (!user) {
      console.log('useAdmin: No user, setting admin to false');
      setIsAdmin(false);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    try {
      console.log('useAdmin: Checking admin status for user:', user.id);
      const supabase = createClient();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('useAdmin: Error fetching admin status:', error);
        setIsAdmin(false);
        setAdminUser(null);
      } else {
        console.log('useAdmin: Profile data:', profile);
        const isAdminUser = profile?.role === 'admin';
        console.log('useAdmin: Is admin user?', isAdminUser);
        setIsAdmin(isAdminUser);
        setAdminUser(isAdminUser ? profile : null);
      }
    } catch (error) {
      console.error('useAdmin: Error checking admin status:', error);
      setIsAdmin(false);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshAdminStatus = () => {
    checkAdminStatus();
  };

  return {
    isAdmin,
    adminUser,
    loading,
    refreshAdminStatus
  };
} 