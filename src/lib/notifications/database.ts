/**
 * Database Notification Utilities
 * 
 * Functions to create and manage notifications in the database
 * Used alongside OneSignal push notifications for in-app notifications
 */

import { createClient } from '@/lib/supabase/server';

export interface DatabaseNotification {
  user_id: string;
  type: 'booking' | 'message' | 'payment' | 'review' | 'favorite' | 'system';
  title: string;
  message: string;
  related_id?: string | null;
  is_read?: boolean;
  created_at?: string;
}

/**
 * Create a database notification
 */
export async function createDatabaseNotification(
  notification: DatabaseNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        related_id: notification.related_id || null,
        is_read: notification.is_read || false,
        created_at: notification.created_at || new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating database notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating database notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create multiple database notifications
 */
export async function createDatabaseNotifications(
  notifications: DatabaseNotification[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  for (const notification of notifications) {
    const result = await createDatabaseNotification(notification);
    if (!result.success && result.error) {
      errors.push(result.error);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Booking-specific notification creators
 */
export const BookingNotifications = {
  /**
   * Create notification for owner when booking request is made
   */
  async createOwnerBookingRequestNotification(
    ownerId: string,
    bookingId: string,
    listingTitle: string,
    renterName: string
  ): Promise<{ success: boolean; error?: string }> {
    return createDatabaseNotification({
      user_id: ownerId,
      type: 'booking',
      title: 'New Booking Request',
      message: `${renterName} wants to rent your "${listingTitle}"`,
      related_id: bookingId,
    });
  },

  /**
   * Create notification for renter when booking is approved
   */
  async createRenterBookingApprovedNotification(
    renterId: string,
    bookingId: string,
    listingTitle: string
  ): Promise<{ success: boolean; error?: string }> {
    return createDatabaseNotification({
      user_id: renterId,
      type: 'booking',
      title: 'Booking Approved!',
      message: `Your booking request for "${listingTitle}" has been approved`,
      related_id: bookingId,
    });
  },

  /**
   * Create notification for renter when booking is rejected
   */
  async createRenterBookingRejectedNotification(
    renterId: string,
    bookingId: string,
    listingTitle: string
  ): Promise<{ success: boolean; error?: string }> {
    return createDatabaseNotification({
      user_id: renterId,
      type: 'booking',
      title: 'Booking Declined',
      message: `Your booking request for "${listingTitle}" was declined`,
      related_id: bookingId,
    });
  },

  /**
   * Create notification for owner when payment is confirmed
   */
  async createOwnerPaymentConfirmedNotification(
    ownerId: string,
    bookingId: string,
    listingTitle: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    return createDatabaseNotification({
      user_id: ownerId,
      type: 'payment',
      title: 'Payment Confirmed',
      message: `Payment of $${amount.toFixed(2)} confirmed for "${listingTitle}" rental`,
      related_id: bookingId,
    });
  },

  /**
   * Create notification for renter when payment is confirmed
   */
  async createRenterPaymentConfirmedNotification(
    renterId: string,
    bookingId: string,
    listingTitle: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    return createDatabaseNotification({
      user_id: renterId,
      type: 'payment',
      title: 'Payment Confirmed',
      message: `Your payment of $${amount.toFixed(2)} for "${listingTitle}" has been confirmed`,
      related_id: bookingId,
    });
  },
};

/**
 * Message-specific notification creators
 */
export const MessageNotifications = {
  /**
   * Create notification for new message
   */
  async createNewMessageNotification(
    receiverId: string,
    senderName: string,
    messagePreview: string,
    conversationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return createDatabaseNotification({
      user_id: receiverId,
      type: 'message',
      title: 'New Message',
      message: `${senderName}: ${messagePreview}`,
      related_id: conversationId || null,
    });
  },
};
