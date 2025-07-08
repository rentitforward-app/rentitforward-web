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

interface Notification {
  id: string;
  type: 'message' | 'booking' | 'payment' | 'review' | 'favorite' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: any;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'messages' | 'bookings'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Load read status from localStorage
      const saved = localStorage.getItem('readNotifications');
      if (saved) {
        setReadNotifications(new Set(JSON.parse(saved)));
      }
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirectTo=/notifications');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login?redirectTo=/notifications');
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const notifications: Notification[] = [];

      // Fetch recent messages (received)
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          booking_id,
          sender:profiles!messages_sender_id_fkey(full_name),
          booking:bookings(
            item:listings(title)
          )
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messages) {
        messages.forEach((msg: any) => {
          const senderName = msg.sender?.full_name || 'Someone';
          const itemTitle = msg.booking?.item?.title || 'an item';
          notifications.push({
            id: `msg-${msg.id}`,
            type: 'message',
            title: 'New Message',
            message: `${senderName} sent you a message about "${itemTitle}"`,
            is_read: false,
            created_at: msg.created_at,
            action_url: '/messages',
            metadata: { messageId: msg.id }
          });
        });
      }

      // Fetch booking requests (for your listings)
      const { data: bookingRequests } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          start_date,
          end_date,
          duration_days,
          price_total,
          renter:profiles!bookings_renter_id_fkey(full_name),
          item:listings!bookings_item_id_fkey(title, owner_id)
        `)
        .eq('status', 'pending')
        .eq('listings.owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (bookingRequests) {
        bookingRequests.forEach((booking: any) => {
          const renterName = booking.renter?.full_name || 'Someone';
          const itemTitle = booking.item?.title || 'your item';
          notifications.push({
            id: `booking-req-${booking.id}`,
            type: 'booking',
            title: 'New Booking Request',
            message: `${renterName} wants to rent your "${itemTitle}" for ${booking.duration_days} days`,
            is_read: false,
            created_at: booking.created_at,
            action_url: '/dashboard/bookings',
            metadata: { bookingId: booking.id }
          });
        });
      }

      // Fetch confirmed bookings (payments received)
      const { data: confirmedBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          price_total,
          platform_fee,
          renter:profiles!bookings_renter_id_fkey(full_name),
          item:listings!bookings_item_id_fkey(title, owner_id)
        `)
        .eq('status', 'confirmed')
        .eq('listings.owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (confirmedBookings) {
        confirmedBookings.forEach((booking: any) => {
          const amount = booking.price_total - (booking.platform_fee || 0);
          const itemTitle = booking.item?.title || 'your item';
          notifications.push({
            id: `payment-${booking.id}`,
            type: 'payment',
            title: 'Payment Received',
            message: `You received $${amount.toFixed(2)} for "${itemTitle}" rental`,
            is_read: false,
            created_at: booking.created_at,
            action_url: '/dashboard',
            metadata: { bookingId: booking.id }
          });
        });
      }

      // Fetch reviews received
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name),
          booking:bookings(
            item:listings(title)
          )
        `)
        .eq('reviewee_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviews) {
        reviews.forEach((review: any) => {
          const reviewerName = review.reviewer?.full_name || 'Someone';
          const itemTitle = review.booking?.item?.title || 'an item';
          notifications.push({
            id: `review-${review.id}`,
            type: 'review',
            title: 'New Review',
            message: `${reviewerName} left you a ${review.rating}-star review for "${itemTitle}"`,
            is_read: false,
            created_at: review.created_at,
            action_url: '/dashboard/reviews',
            metadata: { reviewId: review.id }
          });
        });
      }

      // Add system notifications for new users
      const userCreatedAt = new Date(user.created_at);
      const oneDayAfterSignup = new Date(userCreatedAt.getTime() + 24 * 60 * 60 * 1000);
      
      if (new Date() < oneDayAfterSignup) {
        notifications.push({
          id: 'welcome',
          type: 'system',
          title: 'Welcome to Rent It Forward!',
          message: 'Complete your profile and create your first listing to start earning',
          is_read: false,
          created_at: user.created_at,
          action_url: '/profile'
        });
      }

      // Sort all notifications by created_at
      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

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

  const markAsRead = (id: string) => {
    const newReadNotifications = new Set([...readNotifications, id]);
    setReadNotifications(newReadNotifications);
    localStorage.setItem('readNotifications', JSON.stringify([...newReadNotifications]));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    // Also remove from read status
    const newReadNotifications = new Set(readNotifications);
    newReadNotifications.delete(id);
    setReadNotifications(newReadNotifications);
    localStorage.setItem('readNotifications', JSON.stringify([...newReadNotifications]));
    toast.success('Notification deleted');
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newReadNotifications = new Set([...readNotifications, ...allIds]);
    setReadNotifications(newReadNotifications);
    localStorage.setItem('readNotifications', JSON.stringify([...newReadNotifications]));
    toast.success('All notifications marked as read');
  };

  const isNotificationRead = (id: string) => readNotifications.has(id);

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !isNotificationRead(notif.id);
      case 'messages':
        return notif.type === 'message';
      case 'bookings':
        return notif.type === 'booking';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !isNotificationRead(n.id)).length;

  if (isLoading) {
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
              onClick={fetchNotifications}
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
                  !isNotificationRead(notification.id) ? 'border-l-4 border-l-green-500 bg-green-50' : ''
                }`}
                onClick={() => {
                  if (!isNotificationRead(notification.id)) {
                    markAsRead(notification.id);
                  }
                  if (notification.action_url) {
                    router.push(notification.action_url);
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
                          !isNotificationRead(notification.id) ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          !isNotificationRead(notification.id) ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {!isNotificationRead(notification.id) && (
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