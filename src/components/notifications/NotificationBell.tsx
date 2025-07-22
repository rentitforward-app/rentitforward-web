'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Star, MessageCircle, Calendar, DollarSign } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { CompactReviewNotification } from './ReviewNotification';
import { useRouter } from 'next/navigation';

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

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, refetch } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Separate notifications by type
  const reviewNotifications = notifications.filter(n => n.type === 'review');
  const otherNotifications = notifications.filter(n => n.type !== 'review');
  const unreadReviewCount = reviewNotifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      router.push(notification.action_url);
    } else if (notification.type === 'review' && notification.metadata?.bookingId) {
      router.push(`/bookings/${notification.metadata.bookingId}?action=review`);
    } else if (notification.type === 'booking') {
      router.push('/bookings');
    }
    
    setIsOpen(false);
  };

  const handleReviewClick = (bookingId: string) => {
    router.push(`/bookings/${bookingId}?action=review`);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review':
        return Star;
      case 'message':
        return MessageCircle;
      case 'booking':
        return Calendar;
      case 'payment':
        return DollarSign;
      default:
        return Bell;
    }
  };

  const recentNotifications = [...reviewNotifications, ...otherNotifications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Special indicator for review notifications */}
        {unreadReviewCount > 0 && (
          <span className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
            <Star className="w-2 h-2 text-white" />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadReviewCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Star className="w-3 h-3 mr-1" />
                    {unreadReviewCount} review{unreadReviewCount !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={() => router.push('/notifications')}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <>
                {/* Review Notifications First */}
                {reviewNotifications.slice(0, 3).map((notification) => (
                  <CompactReviewNotification
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onReview={handleReviewClick}
                  />
                ))}

                {/* Other Notifications */}
                {otherNotifications.slice(0, 5 - reviewNotifications.slice(0, 3).length).map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                        !notification.is_read ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          notification.is_read ? 'bg-gray-100' : 'bg-blue-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            notification.is_read ? 'text-gray-600' : 'text-blue-600'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium truncate ${
                              notification.is_read ? 'text-gray-900' : 'text-blue-900'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                            )}
                          </div>
                          
                          <p className={`text-xs mt-1 line-clamp-2 ${
                            notification.is_read ? 'text-gray-600' : 'text-blue-700'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  router.push('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 