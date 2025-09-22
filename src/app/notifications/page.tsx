'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  MessageCircle, 
  Calendar,
  DollarSign,
  Heart,
  Star,
  Check,
  Trash2,
  Filter,
  Settings
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/hooks/use-notifications';

interface Notification {
  id: string;
  type: 'message' | 'booking' | 'payment' | 'review' | 'favorite' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string | null;
  data?: {
    action_url?: string;
    booking_id?: string;
    listing_title?: string;
    type?: string;
    [key: string]: any;
  };
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'messages' | 'bookings'>('all');
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch, loading } = useNotifications();

  // Mark notifications as viewed when page loads
  useEffect(() => {
    const markNotificationsAsViewed = async () => {
      try {
        await fetch('/api/notifications/mark-viewed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        // Refetch to update the unread count
        refetch();
      } catch (error) {
        console.error('Failed to mark notifications as viewed:', error);
      }
    };

    markNotificationsAsViewed();
  }, []); // Run once when component mounts


  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'booking':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'review':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'favorite':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'system':
        return <Bell className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting notification:', error);
        toast.error('Failed to delete notification');
        return;
      }

      toast.success('Notification deleted');
      // Refetch notifications to update the list
      refetch();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.is_read;
      case 'messages':
        return notif.type === 'message';
      case 'bookings':
        return notif.type === 'booking';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">
              Stay updated with your activity {unreadCount > 0 && `(${unreadCount} unread)`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
            <Button 
              variant="outline"
              onClick={refetch}
            >
              <Settings className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'messages', label: 'Messages' },
                { key: 'bookings', label: 'Bookings' }
              ].map((filterOption) => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key as any)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter === filterOption.key
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filterOption.label}
                  {filterOption.key === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 text-xs">({unreadCount})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-500 mb-4">
                {filter === 'unread' 
                  ? "You're all caught up! Check back later for new updates."
                  : notifications.length === 0
                    ? "Start by creating a listing or sending a message to see notifications here."
                    : "We'll notify you when there's something new to see."
                }
              </p>
              {filter !== 'all' && (
                <Button variant="outline" onClick={() => setFilter('all')}>
                  View all notifications
                </Button>
              )}
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  !notification.is_read ? 'border-l-4 border-l-green-500 bg-green-50' : ''
                }`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id);
                  }
                  
                  // Navigate based on notification type and data
                  const actionUrl = notification.data?.action_url;
                  if (actionUrl) {
                    router.push(actionUrl);
                  } else {
                    // Fallback navigation based on notification type
                    switch (notification.type) {
                      case 'booking':
                        if (notification.related_id) {
                          router.push(`/bookings/${notification.related_id}`);
                        } else {
                          router.push('/bookings');
                        }
                        break;
                      case 'message':
                        router.push('/messages');
                        break;
                      case 'payment':
                        if (notification.related_id) {
                          router.push(`/bookings/${notification.related_id}`);
                        } else {
                          router.push('/bookings');
                        }
                        break;
                      case 'review':
                        if (notification.related_id) {
                          router.push(`/bookings/${notification.related_id}?action=review`);
                        } else {
                          router.push('/bookings');
                        }
                        break;
                      case 'system':
                        router.push('/dashboard');
                        break;
                      default:
                        router.push('/dashboard');
                    }
                  }
                }}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Refresh hint */}
        {notifications.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Notifications update automatically. Click "Refresh" to check for new activity.
            </p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 