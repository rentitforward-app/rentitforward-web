/**
 * OneSignal Notification Service (Server-Side)
 * 
 * Handles sending push notifications via OneSignal REST API
 * Integrates with booking workflow for real-time updates
 */

import { NotificationCategory, NotificationPriority, NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITY } from './config';

// OneSignal REST API configuration
const ONESIGNAL_API_CONFIG = {
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
  apiKey: process.env.ONESIGNAL_API_KEY!,
  baseUrl: 'https://onesignal.com/api/v1',
} as const;

// Notification templates for booking workflow
export const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_CATEGORIES.BOOKING_REQUEST]: {
    title: '🏠 New Booking Request',
    message: 'You have a new booking request for "{listingTitle}"',
    icon: '/icons/booking-request.png',
    priority: NOTIFICATION_PRIORITY.HIGH,
    requiresAction: true,
  },
  [NOTIFICATION_CATEGORIES.BOOKING_APPROVED]: {
    title: '✅ Booking Approved!',
    message: 'Your booking for "{listingTitle}" has been approved',
    icon: '/icons/booking-approved.png', 
    priority: NOTIFICATION_PRIORITY.HIGH,
    requiresAction: false,
  },
  [NOTIFICATION_CATEGORIES.BOOKING_REJECTED]: {
    title: '❌ Booking Declined',
    message: 'Your booking request for "{listingTitle}" was declined',
    icon: '/icons/booking-rejected.png',
    priority: NOTIFICATION_PRIORITY.NORMAL,
    requiresAction: false,
  },
  [NOTIFICATION_CATEGORIES.PAYMENT_CONFIRMED]: {
    title: '💳 Payment Confirmed',
    message: 'Payment confirmed for your booking of "{listingTitle}"',
    icon: '/icons/payment-confirmed.png',
    priority: NOTIFICATION_PRIORITY.HIGH,
    requiresAction: false,
  },
  [NOTIFICATION_CATEGORIES.PICKUP_REMINDER]: {
    title: '⏰ Pickup Reminder',
    message: 'Don\'t forget to pick up "{listingTitle}" tomorrow',
    icon: '/icons/pickup-reminder.png',
    priority: NOTIFICATION_PRIORITY.NORMAL,
    requiresAction: true,
  },
  [NOTIFICATION_CATEGORIES.RETURN_REMINDER]: {
    title: '📅 Return Reminder',
    message: 'Please return "{listingTitle}" by tomorrow',
    icon: '/icons/return-reminder.png',
    priority: NOTIFICATION_PRIORITY.HIGH,
    requiresAction: true,
  },
  [NOTIFICATION_CATEGORIES.RENTAL_COMPLETED]: {
    title: '🎉 Rental Completed',
    message: 'Thank you for using "{listingTitle}". Please rate your experience',
    icon: '/icons/rental-completed.png',
    priority: NOTIFICATION_PRIORITY.NORMAL,
    requiresAction: true,
  },
  [NOTIFICATION_CATEGORIES.OWNER_PAYOUT]: {
    title: '💰 Payout Processed',
    message: 'Your payout of {amount} for "{listingTitle}" has been processed',
    icon: '/icons/payout-processed.png',
    priority: NOTIFICATION_PRIORITY.NORMAL,
    requiresAction: false,
  },
} as const;

export interface NotificationData {
  category: NotificationCategory;
  userId: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
  templateVars?: Record<string, string>;
  priority?: NotificationPriority;
  url?: string;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  playersTargeted?: number;
}

class OneSignalNotificationService {
  private readonly baseUrl = ONESIGNAL_API_CONFIG.baseUrl;
  private readonly appId = ONESIGNAL_API_CONFIG.appId;
  private readonly apiKey = ONESIGNAL_API_CONFIG.apiKey;

  /**
   * Send a notification to a specific user
   */
  async sendNotification(notificationData: NotificationData): Promise<NotificationResult> {
    try {
      // Get user's OneSignal player IDs from database
      const playerIds = await this.getUserPlayerIds(notificationData.userId);
      
      if (playerIds.length === 0) {
        console.warn(`No OneSignal player IDs found for user ${notificationData.userId}`);
        return {
          success: false,
          error: 'No player IDs found for user',
          playersTargeted: 0,
        };
      }

      // Get notification template
      const template = NOTIFICATION_TEMPLATES[notificationData.category];
      
      // Build notification content
      const notification = this.buildNotificationPayload(notificationData, template, playerIds);
      
      // Send via OneSignal REST API
      const response = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey}`,
        },
        body: JSON.stringify(notification),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('OneSignal API error:', result);
        return {
          success: false,
          error: result.errors?.join(', ') || 'OneSignal API error',
          playersTargeted: 0,
        };
      }

      // Log notification in database
      await this.logNotification(notificationData, result.id, playerIds.length);

      return {
        success: true,
        notificationId: result.id,
        playersTargeted: playerIds.length,
      };

    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        playersTargeted: 0,
      };
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(notifications: NotificationData[]): Promise<NotificationResult[]> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: 'Promise rejected', playersTargeted: 0 }
    );
  }

  /**
   * Schedule a notification for later delivery
   */
  async scheduleNotification(
    notificationData: NotificationData,
    scheduledAt: Date
  ): Promise<NotificationResult> {
    return this.sendNotification({
      ...notificationData,
      scheduledAt,
    });
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }

  /**
   * Build OneSignal notification payload
   */
  private buildNotificationPayload(
    data: NotificationData,
    template: typeof NOTIFICATION_TEMPLATES[keyof typeof NOTIFICATION_TEMPLATES],
    playerIds: string[]
  ) {
    // Apply template variables
    const title = data.title || this.applyTemplateVars(template.title, data.templateVars);
    const message = data.message || this.applyTemplateVars(template.message, data.templateVars);

    const payload: any = {
      app_id: this.appId,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: message },
      priority: data.priority || template.priority,
      data: {
        category: data.category,
        ...data.data,
      },
    };

    // Add web-specific options
    payload.web_push_topic = data.category;
    payload.chrome_web_icon = template.icon;
    payload.firefox_icon = template.icon;

    // Add URL for clickable notifications
    if (data.url) {
      payload.url = data.url;
    }

    // Add scheduling if specified
    if (data.scheduledAt) {
      payload.send_after = data.scheduledAt.toISOString();
    }

    // Add expiration if specified
    if (data.expiresAt) {
      payload.delayed_option = 'timezone';
      payload.delivery_time_of_day = '9:00AM';
    }

    return payload;
  }

  /**
   * Apply template variables to message templates
   */
  private applyTemplateVars(template: string, vars?: Record<string, string>): string {
    if (!vars) return template;

    return Object.entries(vars).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`{${key}}`, 'g'), value);
    }, template);
  }

  /**
   * Get user's OneSignal player IDs from database
   */
  private async getUserPlayerIds(userId: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/notifications/player-ids/${userId}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.playerIds || [];
    } catch (error) {
      console.error('Failed to get user player IDs:', error);
      return [];
    }
  }

  /**
   * Log notification in database for tracking
   */
  private async logNotification(
    data: NotificationData,
    notificationId: string,
    playersTargeted: number
  ): Promise<void> {
    try {
      await fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.userId,
          onesignal_id: notificationId,
          category: data.category,
          title: data.title,
          message: data.message,
          players_targeted: playersTargeted,
          data: data.data,
          created_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new OneSignalNotificationService();

// Convenience functions for booking workflow
export const BookingNotifications = {
  /**
   * Notify owner of new booking request
   */
  async notifyOwnerBookingRequest(
    ownerId: string,
    bookingId: string,
    listingTitle: string,
    renterName: string
  ): Promise<NotificationResult> {
    return notificationService.sendNotification({
      category: NOTIFICATION_CATEGORIES.BOOKING_REQUEST,
      userId: ownerId,
      templateVars: {
        listingTitle,
        renterName,
      },
      data: {
        bookingId,
        action: 'view_booking_request',
      },
      url: `/dashboard/bookings/${bookingId}`,
      priority: NOTIFICATION_PRIORITY.HIGH,
    });
  },

  /**
   * Notify renter of booking approval
   */
  async notifyRenterBookingApproved(
    renterId: string,
    bookingId: string,
    listingTitle: string
  ): Promise<NotificationResult> {
    return notificationService.sendNotification({
      category: NOTIFICATION_CATEGORIES.BOOKING_APPROVED,
      userId: renterId,
      templateVars: {
        listingTitle,
      },
      data: {
        bookingId,
        action: 'view_booking_details',
      },
      url: `/bookings/${bookingId}`,
      priority: NOTIFICATION_PRIORITY.HIGH,
    });
  },

  /**
   * Notify renter of booking rejection
   */
  async notifyRenterBookingRejected(
    renterId: string,
    bookingId: string,
    listingTitle: string,
    reason?: string
  ): Promise<NotificationResult> {
    return notificationService.sendNotification({
      category: NOTIFICATION_CATEGORIES.BOOKING_REJECTED,
      userId: renterId,
      templateVars: {
        listingTitle,
      },
      data: {
        bookingId,
        reason,
        action: 'find_alternatives',
      },
      url: `/search?similar=${listingTitle}`,
      priority: NOTIFICATION_PRIORITY.NORMAL,
    });
  },

  /**
   * Notify about payment confirmation
   */
  async notifyPaymentConfirmed(
    userId: string,
    bookingId: string,
    listingTitle: string,
    amount: number
  ): Promise<NotificationResult> {
    return notificationService.sendNotification({
      category: NOTIFICATION_CATEGORIES.PAYMENT_CONFIRMED,
      userId,
      templateVars: {
        listingTitle,
        amount: `$${amount.toFixed(2)}`,
      },
      data: {
        bookingId,
        amount,
        action: 'view_receipt',
      },
      url: `/bookings/${bookingId}/receipt`,
      priority: NOTIFICATION_PRIORITY.HIGH,
    });
  },

  /**
   * Send pickup reminder
   */
  async sendPickupReminder(
    renterId: string,
    bookingId: string,
    listingTitle: string,
    pickupTime: Date
  ): Promise<NotificationResult> {
    // Schedule 24 hours before pickup
    const reminderTime = new Date(pickupTime.getTime() - 24 * 60 * 60 * 1000);

    return notificationService.scheduleNotification({
      category: NOTIFICATION_CATEGORIES.PICKUP_REMINDER,
      userId: renterId,
      templateVars: {
        listingTitle,
      },
      data: {
        bookingId,
        pickupTime: pickupTime.toISOString(),
        action: 'confirm_pickup',
      },
      url: `/bookings/${bookingId}/pickup`,
      priority: NOTIFICATION_PRIORITY.NORMAL,
    }, reminderTime);
  },

  /**
   * Send return reminder
   */
  async sendReturnReminder(
    renterId: string,
    bookingId: string,
    listingTitle: string,
    returnTime: Date
  ): Promise<NotificationResult> {
    // Schedule 24 hours before return
    const reminderTime = new Date(returnTime.getTime() - 24 * 60 * 60 * 1000);

    return notificationService.scheduleNotification({
      category: NOTIFICATION_CATEGORIES.RETURN_REMINDER,
      userId: renterId,
      templateVars: {
        listingTitle,
      },
      data: {
        bookingId,
        returnTime: returnTime.toISOString(),
        action: 'confirm_return',
      },
      url: `/bookings/${bookingId}/return`,
      priority: NOTIFICATION_PRIORITY.HIGH,
    }, reminderTime);
  },
};