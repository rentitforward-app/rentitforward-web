'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';

interface NotificationBadgeProps {
  className?: string;
}

export default function NotificationBadge({ className = "" }: NotificationBadgeProps) {
  const { unreadCount, loading } = useNotifications();

  const renderBadge = () => {
    if (loading || unreadCount === 0) {
      return null;
    }

    // Show number if more than 1, just a dot if exactly 1
    if (unreadCount === 1) {
      return (
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
      );
    }

    // Show number for multiple notifications (max 99+)
    const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
    
    return (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
        {displayCount}
      </span>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <Bell className="w-5 h-5" />
      {renderBadge()}
    </div>
  );
} 