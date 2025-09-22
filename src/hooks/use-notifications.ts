import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'message' | 'payment' | 'listing' | 'system';
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once when user is available and we haven't initialized yet
    if (!user?.id || hasInitialized.current) {
      if (!user?.id) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
      return;
    }

    hasInitialized.current = true;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data: notificationsData, error } = await supabase
          .from('app_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }

        const notifications = notificationsData || [];
        setNotifications(notifications);
        
        // Get unread count using timestamp-based API
        try {
          const unreadResponse = await fetch('/api/notifications/unread-count');
          if (unreadResponse.ok) {
            const unreadData = await unreadResponse.json();
            setUnreadCount(unreadData.unreadCount || 0);
          } else {
            // Fallback to counting unread notifications
            const unread = notifications.filter(n => !n.is_read).length;
            setUnreadCount(unread);
          }
        } catch (unreadError) {
          console.error('Error fetching unread count:', unreadError);
          // Fallback to counting unread notifications
          const unread = notifications.filter(n => !n.is_read).length;
          setUnreadCount(unread);
        }

      } catch (error) {
        console.error('Error in fetchNotifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id]); // Only depend on user.id

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('app_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map((n: Notification) => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('app_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map((n: Notification) => ({ ...n, is_read: true }))
      );
      
      setUnreadCount(0);

    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  const refetch = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      
      if (response.ok) {
        const data = await response.json();
        const notifications = data.notifications || [];
        setNotifications(notifications);
        
        // Count unread notifications
        const unread = notifications.filter((n: Notification) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error refetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch
  };
} 