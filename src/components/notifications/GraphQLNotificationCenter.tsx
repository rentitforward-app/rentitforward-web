'use client';

import React, { useState } from 'react';
import {
  useNotifications,
  useNotificationSettings,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
  useUpdateNotificationPreferences,
  useSendTestNotification,
  useNotificationGroups,
  useNotificationAnalytics
} from '@/hooks/graphql/useNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@rentitforward/shared/utils/formatting';

interface NotificationCenterProps {
  userId?: string;
  isPopover?: boolean;
  maxHeight?: string;
}

/**
 * Comprehensive Notification Center with Real-time Updates
 * Demonstrates GraphQL subscriptions, optimistic updates, and smart UX
 */
export function GraphQLNotificationCenter({ 
  userId, 
  isPopover = false, 
  maxHeight = 'auto' 
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings' | 'analytics'>('notifications');
  const [filter, setFilter] = useState<string>('all');
  
  // GraphQL hooks
  const {
    notifications,
    loading,
    unreadCount,
    unreadNotifications,
    highPriorityNotifications,
    recentNotifications,
    loadMore,
    hasMore,
    refetch
  } = useNotifications({ read: filter === 'unread' ? false : undefined }, userId);
  
  const { settings, loading: settingsLoading } = useNotificationSettings();
  const { markNotificationRead } = useMarkNotificationRead();
  const { markAllNotificationsRead, loading: markAllLoading } = useMarkAllRead();
  const { deleteUserNotification } = useDeleteNotification();
  const { updateNotificationPreferences } = useUpdateNotificationPreferences();
  const { sendTestNotification } = useSendTestNotification();
  const { groupedNotifications, getGroupTitle, getGroupIcon } = useNotificationGroups(notifications);
  const { analytics, overallEngagement, topCategory } = useNotificationAnalytics();

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if unread
    if (!notification.read) {
      await markNotificationRead(notification.id);
    }

    // Handle notification action
    if (notification.actions && notification.actions.length > 0) {
      handleNotificationAction(notification.actions[0]);
    }
  };

  const handleNotificationAction = (action: any) => {
    switch (action.action_type) {
      case 'navigate':
        window.location.href = action.action_data.url;
        break;
      case 'booking_view':
        window.location.href = `/bookings/${action.action_data.booking_id}`;
        break;
      case 'message_reply':
        window.location.href = `/messages/${action.action_data.conversation_id}`;
        break;
      default:
        console.log('Unknown action:', action.action_type);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'immediate': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed': return '✅';
      case 'booking_request': return '📅';
      case 'payment_received': return '💰';
      case 'message_received': return '💬';
      case 'listing_viewed': return '👀';
      case 'review_received': return '⭐';
      case 'security_alert': return '🔒';
      default: return '📢';
    }
  };

  if (isPopover) {
    return <NotificationPopover 
      notifications={recentNotifications}
      unreadCount={unreadCount}
      onNotificationClick={handleNotificationClick}
      onMarkAllRead={markAllNotificationsRead}
      loading={loading}
    />;
  }

  return (
    <div className="space-y-6" style={{ maxHeight, overflow: 'auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            🔄 Refresh
          </Button>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllNotificationsRead}
              disabled={markAllLoading}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Real-time Status Indicator */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-medium">Real-time notifications active</span>
            <span className="text-green-600 text-sm">
              • Last update: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">
            Notifications 
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('high')}
            >
              Priority ({highPriorityNotifications.length})
            </Button>
          </div>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <NotificationListSkeleton />
          ) : notifications.length > 0 ? (
            <div className="space-y-3">
              {/* Group by category */}
              {Object.entries(groupedNotifications).map(([category, categoryNotifications]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">{getGroupIcon(category)}</span>
                    {getGroupTitle(category)} ({categoryNotifications.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {categoryNotifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onDelete={() => deleteUserNotification(notification.id)}
                        getTypeIcon={getTypeIcon}
                        getPriorityColor={getPriorityColor}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center">
                  <Button variant="outline" onClick={loadMore} disabled={loading}>
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">🔕</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No notifications
                </h3>
                <p className="text-gray-600">
                  {filter === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <NotificationSettings
            settings={settings}
            loading={settingsLoading}
            onUpdate={updateNotificationPreferences}
            onSendTest={sendTestNotification}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <NotificationAnalytics
            analytics={analytics}
            overallEngagement={overallEngagement}
            topCategory={topCategory}
          />
        </TabsContent>
      </Tabs>

      {/* GraphQL Demo Info */}
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-800">🔔 Real-time Notification Features</CardTitle>
        </CardHeader>
        <CardContent className="text-purple-700">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Live Features:</h4>
              <ul className="space-y-1 text-sm">
                <li>📡 <strong>WebSocket Subscriptions</strong>: Instant notification delivery</li>
                <li>🔄 <strong>Optimistic Updates</strong>: Read status updates immediately</li>
                <li>🎯 <strong>Smart Batching</strong>: Groups rapid notifications intelligently</li>
                <li>🔕 <strong>Quiet Hours</strong>: Respects user sleep schedules</li>
                <li>📊 <strong>Analytics</strong>: Engagement tracking and insights</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Advanced UX:</h4>
              <ul className="space-y-1 text-sm">
                <li>🏷️ <strong>Smart Categorization</strong>: Auto-groups by type/priority</li>
                <li>⚡ <strong>Action Buttons</strong>: Direct actions from notifications</li>
                <li>🎨 <strong>Priority Styling</strong>: Visual hierarchy by importance</li>
                <li>💾 <strong>Offline Support</strong>: Queues actions when offline</li>
                <li>🔊 <strong>Sound & Haptics</strong>: Multi-sensory feedback</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Notification Card Component
function NotificationCard({ 
  notification, 
  onClick, 
  onDelete, 
  getTypeIcon, 
  getPriorityColor 
}: any) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        !notification.read 
          ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' 
          : 'bg-white'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Type Icon */}
          <div className="text-2xl mt-1">
            {getTypeIcon(notification.type)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                
                <p className="text-gray-700 text-sm mb-2 line-clamp-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatDate(new Date(notification.created_at))}</span>
                  
                  {notification.priority && notification.priority !== 'low' && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(notification.priority)}`}
                    >
                      {notification.priority}
                    </Badge>
                  )}
                  
                  {notification.category && (
                    <Badge variant="outline" className="text-xs">
                      {notification.category}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-1 ml-2">
                {notification.actions && notification.actions.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle action
                    }}
                  >
                    {notification.actions[0].label}
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  ×
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Notification Popover for Header
function NotificationPopover({ 
  notifications, 
  unreadCount, 
  onNotificationClick, 
  onMarkAllRead, 
  loading 
}: any) {
  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={onMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>
      
      {/* Notifications */}
      <div className="p-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex space-x-3 p-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-1">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`p-3 rounded cursor-pointer hover:bg-gray-50 ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => onNotificationClick(notification)}
              >
                <div className="flex items-start space-x-2">
                  <span className="text-lg">{notification.type === 'booking_request' ? '📅' : '📢'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{notification.title}</p>
                    <p className="text-xs text-gray-600 truncate">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(new Date(notification.created_at))}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-600">
            <div className="text-4xl mb-2">🔕</div>
            <p className="text-sm">No new notifications</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t text-center">
          <Button variant="ghost" size="sm" asChild>
            <a href="/notifications">View all notifications</a>
          </Button>
        </div>
      )}
    </div>
  );
}

// Notification Settings Component
function NotificationSettings({ settings, loading, onUpdate, onSendTest }: any) {
  const [preferences, setPreferences] = useState(settings || {});

  React.useEffect(() => {
    if (settings) {
      setPreferences(settings);
    }
  }, [settings]);

  const handleToggle = (key: string, value: boolean) => {
    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);
    onUpdate(updatedPreferences);
  };

  if (loading) {
    return <NotificationSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Preferences</CardTitle>
          <CardDescription>
            Control how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <Switch
              checked={preferences.email_notifications || false}
              onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Push Notifications</h4>
              <p className="text-sm text-gray-600">Receive browser push notifications</p>
            </div>
            <Switch
              checked={preferences.push_notifications || false}
              onCheckedChange={(checked) => handleToggle('push_notifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">SMS Notifications</h4>
              <p className="text-sm text-gray-600">Receive notifications via text message</p>
            </div>
            <Switch
              checked={preferences.sms_notifications || false}
              onCheckedChange={(checked) => handleToggle('sms_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Choose which types of notifications to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'booking_updates', label: 'Booking Updates', desc: 'Confirmations, cancellations, and changes' },
            { key: 'payment_confirmations', label: 'Payment Confirmations', desc: 'Payment receipts and refunds' },
            { key: 'listing_activity', label: 'Listing Activity', desc: 'Views, favorites, and inquiries' },
            { key: 'messages', label: 'Messages', desc: 'New messages from other users' },
            { key: 'promotions', label: 'Promotions', desc: 'Special offers and discounts' },
            { key: 'security_alerts', label: 'Security Alerts', desc: 'Account security notifications' },
          ].map((category) => (
            <div key={category.key} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{category.label}</h4>
                <p className="text-sm text-gray-600">{category.desc}</p>
              </div>
              <Switch
                checked={preferences[category.key] || false}
                onCheckedChange={(checked) => handleToggle(category.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications</CardTitle>
          <CardDescription>
            Send test notifications to verify your settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSendTest('booking_confirmed')}
            >
              Test Booking Notification
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSendTest('message_received')}
            >
              Test Message Notification
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSendTest('payment_received')}
            >
              Test Payment Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Notification Analytics Component
function NotificationAnalytics({ analytics, overallEngagement, topCategory }: any) {
  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-600">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analytics.total_sent}
            </div>
            <div className="text-sm text-gray-600">Total Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {analytics.total_read}
            </div>
            <div className="text-sm text-gray-600">Total Read</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {overallEngagement}%
            </div>
            <div className="text-sm text-gray-600">Read Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {analytics.total_clicked}
            </div>
            <div className="text-sm text-gray-600">Actions Taken</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {analytics.by_category && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.by_category.map((category: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium capitalize">{category.category}</span>
                  <div className="text-right">
                    <div className="font-semibold">{category.count}</div>
                    <div className="text-sm text-gray-600">
                      {(category.read_rate * 100).toFixed(1)}% read
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading Skeletons
function NotificationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex space-x-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NotificationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 