import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';

// Notification queries
const GET_NOTIFICATIONS = gql`
  query GetNotifications($filter: NotificationFilter, $first: Int = 20) {
    notifications(filter: $filter, first: $first) {
      edges {
        node {
          id
          type
          title
          message
          data
          read
          priority
          created_at
          expires_at
          
          # Related entities
          user {
            id
            full_name
            avatar_url
          }
          
          # Action buttons/links
          actions {
            label
            action_type
            action_data
            style
          }
          
          # Category grouping
          category
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      unreadCount
    }
  }
`;

const GET_NOTIFICATION_SETTINGS = gql`
  query GetNotificationSettings {
    me {
      id
      notification_preferences {
        email_notifications
        push_notifications
        sms_notifications
        
        # Granular preferences
        booking_updates
        payment_confirmations
        listing_activity
        messages
        promotions
        security_alerts
        
        # Timing preferences
        quiet_hours_start
        quiet_hours_end
        frequency
      }
    }
  }
`;

// Notification mutations
const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationAsRead(notificationId: $notificationId) {
      success
      message
      notification {
        id
        read
      }
    }
  }
`;

const MARK_ALL_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsAsRead {
      success
      message
      marked_count
    }
  }
`;

const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($notificationId: ID!) {
    deleteNotification(notificationId: $notificationId) {
      success
      message
    }
  }
`;

const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($input: NotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      success
      message
      preferences {
        email_notifications
        push_notifications
        sms_notifications
        booking_updates
        payment_confirmations
        listing_activity
        messages
        promotions
        security_alerts
        quiet_hours_start
        quiet_hours_end
        frequency
      }
    }
  }
`;

const SEND_TEST_NOTIFICATION = gql`
  mutation SendTestNotification($type: String!) {
    sendTestNotification(type: $type) {
      success
      message
    }
  }
`;

// Real-time notification subscriptions
const NOTIFICATION_ADDED = gql`
  subscription NotificationAdded($userId: ID!) {
    notificationAdded(userId: $userId) {
      id
      type
      title
      message
      data
      read
      priority
      created_at
      category
      
      user {
        id
        full_name
        avatar_url
      }
      
      actions {
        label
        action_type
        action_data
        style
      }
    }
  }
`;

const NOTIFICATION_UPDATED = gql`
  subscription NotificationUpdated($userId: ID!) {
    notificationUpdated(userId: $userId) {
      id
      read
      updated_at
    }
  }
`;

// Hook for getting notifications with real-time updates
export function useNotifications(filter?: any, userId?: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const {
    data,
    loading,
    error,
    fetchMore,
    refetch
  } = useQuery(GET_NOTIFICATIONS, {
    variables: { filter, first: 20 },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  // Real-time subscription for new notifications
  const { data: newNotification } = useSubscription(NOTIFICATION_ADDED, {
    variables: { userId: userId || 'current-user' },
    skip: !userId,
  });

  // Real-time subscription for notification updates (read status, etc.)
  const { data: updatedNotification } = useSubscription(NOTIFICATION_UPDATED, {
    variables: { userId: userId || 'current-user' },
    skip: !userId,
  });

  // Update local state when new notifications arrive
  useEffect(() => {
    if (newNotification?.notificationAdded) {
      const notification = newNotification.notificationAdded;
      
      // Add to local state
      setNotifications(prev => [notification, ...prev]);
      
      // Show toast notification for high priority items
      if (notification.priority === 'high' || notification.priority === 'immediate') {
        toast.success(notification.title, {
          description: notification.message,
          action: notification.actions?.[0] ? {
            label: notification.actions[0].label,
            onClick: () => handleNotificationAction(notification.actions[0])
          } : undefined,
        });
      }
      
      // Play notification sound for immediate priority
      if (notification.priority === 'immediate') {
        playNotificationSound();
      }
    }
  }, [newNotification]);

  // Update notification read status
  useEffect(() => {
    if (updatedNotification?.notificationUpdated) {
      const update = updatedNotification.notificationUpdated;
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === update.id 
            ? { ...notification, read: update.read }
            : notification
        )
      );
    }
  }, [updatedNotification]);

  // Initialize notifications from query
  useEffect(() => {
    if (data?.notifications?.edges) {
      setNotifications(data.notifications.edges.map((edge: any) => edge.node));
    }
  }, [data]);

  const loadMore = async () => {
    if (data?.notifications?.pageInfo?.hasNextPage) {
      await fetchMore({
        variables: {
          after: data.notifications.pageInfo.endCursor
        }
      });
    }
  };

  return {
    notifications,
    loading,
    error,
    refetch,
    loadMore,
    hasMore: data?.notifications?.pageInfo?.hasNextPage || false,
    totalCount: data?.notifications?.totalCount || 0,
    unreadCount: data?.notifications?.unreadCount || 0,
    
    // Filtered views
    unreadNotifications: notifications.filter(n => !n.read),
    highPriorityNotifications: notifications.filter(n => ['high', 'immediate'].includes(n.priority)),
    recentNotifications: notifications.slice(0, 5),
  };
}

// Hook for notification settings
export function useNotificationSettings() {
  const {
    data,
    loading,
    error,
    refetch
  } = useQuery(GET_NOTIFICATION_SETTINGS, {
    errorPolicy: 'all'
  });

  return {
    settings: data?.me?.notification_preferences,
    loading,
    error,
    refetch
  };
}

// Hook for marking notifications as read
export function useMarkNotificationRead() {
  const [markRead, { loading }] = useMutation(MARK_NOTIFICATION_READ, {
    // Optimistic update
    optimisticResponse: (variables) => ({
      markNotificationAsRead: {
        success: true,
        message: 'Marked as read',
        notification: {
          id: variables.notificationId,
          read: true,
        },
      },
    }),
    // Update cache
    update: (cache, { data }) => {
      if (data?.markNotificationAsRead?.success) {
        cache.modify({
          id: cache.identify({ __typename: 'Notification', id: data.markNotificationAsRead.notification.id }),
          fields: {
            read: () => true,
          },
        });
        
        // Update unread count
        cache.modify({
          fields: {
            notifications: (existing, { readField }) => {
              const unreadCount = readField('unreadCount', existing);
              return {
                ...existing,
                unreadCount: Math.max(0, (unreadCount || 1) - 1),
              };
            },
          },
        });
      }
    },
  });
  
  const markNotificationRead = async (notificationId: string) => {
    try {
      const result = await markRead({
        variables: { notificationId }
      });

      return result.data?.markNotificationAsRead?.success || false;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  };

  return {
    markNotificationRead,
    loading
  };
}

// Hook for marking all notifications as read
export function useMarkAllRead() {
  const [markAllRead, { loading }] = useMutation(MARK_ALL_READ, {
    // Update cache to mark all as read
    update: (cache, { data }) => {
      if (data?.markAllNotificationsAsRead?.success) {
        cache.modify({
          fields: {
            notifications: (existing) => ({
              ...existing,
              edges: existing.edges.map((edge: any) => ({
                ...edge,
                node: {
                  ...edge.node,
                  read: true,
                },
              })),
              unreadCount: 0,
            }),
          },
        });
      }
    },
  });
  
  const markAllNotificationsRead = async () => {
    try {
      const result = await markAllRead();
      
      if (result.data?.markAllNotificationsAsRead?.success) {
        toast.success(`Marked ${result.data.markAllNotificationsAsRead.marked_count} notifications as read`);
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
      return false;
    }
  };

  return {
    markAllNotificationsRead,
    loading
  };
}

// Hook for deleting notifications
export function useDeleteNotification() {
  const [deleteNotification, { loading }] = useMutation(DELETE_NOTIFICATION, {
    // Remove from cache
    update: (cache, { data }, { variables }) => {
      if (data?.deleteNotification?.success) {
        cache.evict({
          id: cache.identify({ __typename: 'Notification', id: variables?.notificationId }),
        });
        cache.gc();
      }
    },
  });
  
  const deleteUserNotification = async (notificationId: string) => {
    try {
      const result = await deleteNotification({
        variables: { notificationId }
      });

      if (result.data?.deleteNotification?.success) {
        toast.success('Notification deleted');
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Failed to delete notification');
      return false;
    }
  };

  return {
    deleteUserNotification,
    loading
  };
}

// Hook for updating notification preferences
export function useUpdateNotificationPreferences() {
  const [updatePreferences, { loading }] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);
  
  const updateNotificationPreferences = async (preferences: any) => {
    try {
      const result = await updatePreferences({
        variables: {
          input: preferences
        }
      });

      if (result.data?.updateNotificationPreferences?.success) {
        toast.success('Notification preferences updated');
        return { success: true, preferences: result.data.updateNotificationPreferences.preferences };
      } else {
        toast.error('Failed to update preferences');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to update notification preferences');
      return { success: false, error };
    }
  };

  return {
    updateNotificationPreferences,
    loading
  };
}

// Hook for sending test notifications
export function useSendTestNotification() {
  const [sendTest, { loading }] = useMutation(SEND_TEST_NOTIFICATION);
  
  const sendTestNotification = async (type: string) => {
    try {
      const result = await sendTest({
        variables: { type }
      });

      if (result.data?.sendTestNotification?.success) {
        toast.success('Test notification sent');
        return true;
      } else {
        toast.error('Failed to send test notification');
        return false;
      }
    } catch (error) {
      toast.error('Failed to send test notification');
      return false;
    }
  };

  return {
    sendTestNotification,
    loading
  };
}

// Hook for notification grouping and categorization
export function useNotificationGroups(notifications: any[]) {
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const category = notification.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(notification);
    return groups;
  }, {} as Record<string, any[]>);

  const getGroupTitle = (category: string) => {
    switch (category) {
      case 'booking': return 'Booking Updates';
      case 'payment': return 'Payment & Financial';
      case 'message': return 'Messages';
      case 'listing': return 'Listing Activity';
      case 'security': return 'Security Alerts';
      case 'promotion': return 'Promotions & Offers';
      default: return 'General';
    }
  };

  const getGroupIcon = (category: string) => {
    switch (category) {
      case 'booking': return '📅';
      case 'payment': return '💳';
      case 'message': return '💬';
      case 'listing': return '🏠';
      case 'security': return '🔒';
      case 'promotion': return '🎉';
      default: return '📱';
    }
  };

  return {
    groupedNotifications,
    getGroupTitle,
    getGroupIcon,
    categories: Object.keys(groupedNotifications),
  };
}

// Utility functions
function playNotificationSound() {
  // In a real implementation, this would play a notification sound
  if ('Audio' in window) {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors if sound can't play
      });
    } catch (error) {
      // Ignore errors
    }
  }
}

function handleNotificationAction(action: any) {
  switch (action.action_type) {
    case 'navigate':
      window.location.href = action.action_data.url;
      break;
    case 'modal':
      // Open modal with action_data
      break;
    case 'api_call':
      // Make API call with action_data
      break;
    default:
      console.log('Unknown action type:', action.action_type);
  }
}

// Hook for notification analytics
export function useNotificationAnalytics() {
  const GET_NOTIFICATION_ANALYTICS = gql`
    query GetNotificationAnalytics($dateRange: DateRangeInput) {
      notificationAnalytics(dateRange: $dateRange) {
        total_sent
        total_delivered
        total_read
        total_clicked
        read_rate
        click_rate
        
        # By category
        by_category {
          category
          count
          read_rate
        }
        
        # By type
        by_type {
          type
          count
          engagement_rate
        }
        
        # Timing analysis
        peak_hours {
          hour
          count
        }
        
        # User engagement
        most_engaged_users {
          user {
            id
            full_name
          }
          engagement_score
        }
      }
    }
  `;

  const { data, loading, error } = useQuery(GET_NOTIFICATION_ANALYTICS, {
    errorPolicy: 'all'
  });

  return {
    analytics: data?.notificationAnalytics,
    loading,
    error,
    
    // Computed metrics
    overallEngagement: data?.notificationAnalytics ? 
      (data.notificationAnalytics.total_read / data.notificationAnalytics.total_sent * 100).toFixed(1) : '0',
    topCategory: data?.notificationAnalytics?.by_category?.[0]?.category || 'N/A',
    peakHour: data?.notificationAnalytics?.peak_hours?.reduce((max: any, hour: any) => 
      hour.count > (max?.count || 0) ? hour : max, null)?.hour || 'N/A',
  };
}

// Hook for smart notification batching
export function useNotificationBatching() {
  const [batchedNotifications, setBatchedNotifications] = useState<any[]>([]);
  const [batchTimer, setBatchTimer] = useState<NodeJS.Timeout | null>(null);

  const addToBatch = (notification: any) => {
    setBatchedNotifications(prev => [...prev, notification]);
    
    // Clear existing timer
    if (batchTimer) {
      clearTimeout(batchTimer);
    }
    
    // Set new timer to show batched notifications
    const timer = setTimeout(() => {
      if (batchedNotifications.length > 0) {
        showBatchedNotifications(batchedNotifications);
        setBatchedNotifications([]);
      }
    }, 3000); // Batch for 3 seconds
    
    setBatchTimer(timer);
  };

  const showBatchedNotifications = (notifications: any[]) => {
    if (notifications.length === 1) {
      // Show single notification normally
      toast.success(notifications[0].title, {
        description: notifications[0].message,
      });
    } else {
      // Show batched notification
      toast.success(`${notifications.length} new notifications`, {
        description: `Latest: ${notifications[notifications.length - 1].title}`,
        action: {
          label: 'View All',
          onClick: () => {
            // Navigate to notifications page
            window.location.href = '/notifications';
          }
        }
      });
    }
  };

  return {
    addToBatch,
    batchedCount: batchedNotifications.length,
  };
} 