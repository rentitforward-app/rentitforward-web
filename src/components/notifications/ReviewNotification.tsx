'use client';

import React from 'react';
import { Star, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDistanceToNow } from 'date-fns';

interface ReviewNotificationProps {
  notification: {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    action_url?: string;
    metadata?: {
      bookingId: string;
      listingTitle: string;
      reviewType: 'renter_to_owner' | 'owner_to_renter';
      ownerName?: string;
      renterName?: string;
    };
  };
  onMarkAsRead: (notificationId: string) => void;
  onReview: (bookingId: string) => void;
  className?: string;
}

export function ReviewNotification({ 
  notification, 
  onMarkAsRead, 
  onReview, 
  className = '' 
}: ReviewNotificationProps) {
  const handleReviewClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.metadata?.bookingId) {
      onReview(notification.metadata.bookingId);
    }
  };

  const isRenterReview = notification.metadata?.reviewType === 'renter_to_owner';
  const otherPartyName = isRenterReview 
    ? notification.metadata?.ownerName 
    : notification.metadata?.renterName;

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
      notification.is_read ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-500'
    } ${className}`}>
      <div className="p-4">
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            notification.is_read ? 'bg-gray-100' : 'bg-blue-100'
          }`}>
            <Star className={`w-5 h-5 ${
              notification.is_read ? 'text-gray-600' : 'text-blue-600'
            }`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-medium ${
                notification.is_read ? 'text-gray-900' : 'text-blue-900'
              }`}>
                {notification.title}
              </h3>
              
              {/* Read status indicator */}
              {!notification.is_read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>

            <p className={`text-sm ${
              notification.is_read ? 'text-gray-600' : 'text-blue-800'
            } mb-3`}>
              {notification.message}
            </p>

            {/* Metadata display */}
            {notification.metadata && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Listing:</strong> {notification.metadata.listingTitle}
                </p>
                {otherPartyName && (
                  <p className="text-xs text-gray-600">
                    <strong>{isRenterReview ? 'Owner' : 'Renter'}:</strong> {otherPartyName}
                  </p>
                )}
              </div>
            )}

            {/* Actions and timestamp */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleReviewClick}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Leave Review
                </Button>
                
                {!notification.is_read && (
                  <Button
                    onClick={() => onMarkAsRead(notification.id)}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark Read
                  </Button>
                )}
              </div>

              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Compact version for notification dropdown/bell
export function CompactReviewNotification({ 
  notification, 
  onMarkAsRead, 
  onReview, 
  className = '' 
}: ReviewNotificationProps) {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.metadata?.bookingId) {
      onReview(notification.metadata.bookingId);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
        !notification.is_read ? 'bg-blue-50' : ''
      } ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          notification.is_read ? 'bg-gray-100' : 'bg-blue-100'
        }`}>
          <Star className={`w-4 h-4 ${
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
          
          <p className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
} 