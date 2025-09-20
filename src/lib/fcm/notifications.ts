/**
 * FCM Notification Service (Server-Side)
 * 
 * Handles sending push notifications via Firebase Cloud Messaging
 * Replaces OneSignal implementation with FCM
 */

import { fcmAdminService, buildFCMMessage, type FCMSendResult } from './admin';
import { createClient } from '@/lib/supabase/server';
import { 
  NotificationType, 
  NotificationContext, 
  createNotification, 
  NOTIFICATION_TEMPLATES 
} from '@rentitforward/shared';

// FCM notification categories (mapped from shared types)
export const FCM_NOTIFICATION_CATEGORIES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  MESSAGE_RECEIVED: 'message_received',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  REVIEW_RECEIVED: 'review_received',
  REVIEW_REQUEST: 'review_request',
  LISTING_APPROVED: 'listing_approved',
  LISTING_REJECTED: 'listing_rejected',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  REMINDER: 'reminder',
} as const;

export type FCMNotificationCategory = typeof FCM_NOTIFICATION_CATEGORIES[keyof typeof FCM_NOTIFICATION_CATEGORIES];

// FCM notification priority levels
export const FCM_NOTIFICATION_PRIORITY = {
  LOW: 'normal',
  NORMAL: 'normal',
  HIGH: 'high',
} as const;

export type FCMNotificationPriority = typeof FCM_NOTIFICATION_PRIORITY[keyof typeof FCM_NOTIFICATION_PRIORITY];

// FCM notification data interface
export interface FCMNotificationData {
  category: FCMNotificationCategory;
  userId: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
  templateVars?: Record<string, string>;
  priority?: FCMNotificationPriority;
  url?: string;
  imageUrl?: string;
  scheduledAt?: Date;
  expiresAt?: Date;
  platforms?: ('web' | 'ios' | 'android')[];
}

// FCM notification result
export interface FCMNotificationResult {
  success: boolean;
  messageIds?: string[];
  error?: string;
  tokensTargeted?: number;
  platformResults?: {
    web?: FCMSendResult;
    ios?: FCMSendResult;
    android?: FCMSendResult;
  };
}

class FCMNotificationService {
  /**
   * Send a notification to a specific user
   */
  async sendNotification(notificationData: FCMNotificationData): Promise<FCMNotificationResult> {
    try {
      // Check if user should receive this notification
      const shouldSend = await this.shouldSendNotification(
        notificationData.userId,
        notificationData.category
      );

      if (!shouldSend) {
        console.log(`User ${notificationData.userId} has disabled ${notificationData.category} notifications`);
        return {
          success: false,
          error: 'User has disabled this notification type',
          tokensTargeted: 0,
        };
      }

      // Get user's FCM tokens
      const userTokens = await fcmAdminService.getUserFCMTokens(notificationData.userId);
      
      if (userTokens.length === 0) {
        console.warn(`No FCM tokens found for user ${notificationData.userId}`);
        return {
          success: false,
          error: 'No FCM tokens found for user',
          tokensTargeted: 0,
        };
      }

      // Filter tokens by platform if specified
      const filteredTokens = notificationData.platforms
        ? userTokens.filter(token => notificationData.platforms!.includes(token.platform as any))
        : userTokens;

      if (filteredTokens.length === 0) {
        return {
          success: false,
          error: 'No tokens found for specified platforms',
          tokensTargeted: 0,
        };
      }

      // Get notification template
      const template = NOTIFICATION_TEMPLATES[notificationData.category];
      
      // Build notification content
      const { title, message, data } = this.buildNotificationContent(notificationData, template);
      
      // Create in-app notification record
      const appNotificationId = await fcmAdminService.createAppNotification(
        notificationData.userId,
        notificationData.category,
        title,
        message,
        notificationData.url,
        { ...notificationData.data, ...data },
        this.getPriorityNumber(notificationData.priority || 'normal')
      );

      // Build FCM message
      const fcmMessage = buildFCMMessage(title, message, data, {
        imageUrl: notificationData.imageUrl || template?.big_picture,
        clickAction: notificationData.url,
        priority: notificationData.priority || 'normal',
        channelId: this.getChannelId(notificationData.category),
        category: this.getCategoryId(notificationData.category),
      });

      // Group tokens by platform for platform-specific sending
      const tokensByPlatform = this.groupTokensByPlatform(filteredTokens);
      const platformResults: FCMNotificationResult['platformResults'] = {};
      const messageIds: string[] = [];
      let totalSuccess = true;

      // Send to each platform
      for (const [platform, tokens] of Object.entries(tokensByPlatform)) {
        if (tokens.length === 0) continue;

        const tokenStrings = tokens.map(t => t.token);
        const result = await fcmAdminService.sendToTokens(tokenStrings, fcmMessage);
        
        platformResults[platform as keyof typeof platformResults] = result;

        if (result.success && result.responses) {
          // Log successful notifications
          for (const response of result.responses) {
            if (response.success && response.messageId) {
              messageIds.push(response.messageId);
              await fcmAdminService.logNotification(
                notificationData.userId,
                response.messageId,
                notificationData.category,
                title,
                message,
                platform,
                (response as any).token,
                'sent'
              );
            } else if (response.error) {
              await fcmAdminService.logNotification(
                notificationData.userId,
                '',
                notificationData.category,
                title,
                message,
                platform,
                (response as any).token,
                'failed',
                response.error
              );
            }
          }

          // Clean up invalid tokens
          const invalidTokens = result.responses
            .filter(r => !r.success && r.error?.includes('registration-token-not-registered'))
            .map(r => (r as any).token);
          
          if (invalidTokens.length > 0) {
            await fcmAdminService.cleanupInvalidTokens(invalidTokens);
          }
        } else {
          totalSuccess = false;
        }
      }

      return {
        success: totalSuccess && messageIds.length > 0,
        messageIds,
        tokensTargeted: filteredTokens.length,
        platformResults,
      };

    } catch (error) {
      console.error('Failed to send FCM notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokensTargeted: 0,
      };
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(notifications: FCMNotificationData[]): Promise<FCMNotificationResult[]> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: 'Promise rejected', tokensTargeted: 0 }
    );
  }

  /**
   * Send notification using shared notification system
   */
  async sendTypedNotification<T extends NotificationType>(
    type: T,
    userId: string,
    context: NotificationContext[T],
    options?: {
      priority?: FCMNotificationPriority;
      platforms?: ('web' | 'ios' | 'android')[];
      imageUrl?: string;
    }
  ): Promise<FCMNotificationResult> {
    // Create notification using shared system
    const notification = createNotification(type, context, userId);

    return this.sendNotification({
      category: type as FCMNotificationCategory,
      userId,
      title: notification.title,
      message: notification.message,
      data: {
        type,
        action_url: notification.action_url,
        ...notification.data,
      },
      url: notification.action_url,
      priority: options?.priority || 'normal',
      platforms: options?.platforms,
      imageUrl: options?.imageUrl,
    });
  }

  /**
   * Schedule a notification for later delivery
   */
  async scheduleNotification(
    notificationData: FCMNotificationData,
    scheduledAt: Date
  ): Promise<FCMNotificationResult> {
    // For now, FCM doesn't support scheduling directly
    // This would need to be implemented with a job queue system
    console.warn('FCM notification scheduling not yet implemented');
    
    return this.sendNotification({
      ...notificationData,
      scheduledAt,
    });
  }

  /**
   * Build notification content from template and data
   */
  private buildNotificationContent(
    data: FCMNotificationData,
    template?: typeof NOTIFICATION_TEMPLATES[keyof typeof NOTIFICATION_TEMPLATES]
  ): { title: string; message: string; data: Record<string, string> } {
    // Use provided title/message or apply template
    const title = data.title || (template ? this.applyTemplateVars(template.title, data.templateVars) : 'Notification');
    const message = data.message || (template ? this.applyTemplateVars(template.message, data.templateVars) : '');

    // Build data payload (FCM requires string values)
    const dataPayload: Record<string, string> = {
      category: data.category,
      type: data.category,
      ...(data.url && { action_url: data.url }),
      ...(data.data && Object.fromEntries(
        Object.entries(data.data).map(([key, value]) => [
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        ])
      )),
    };

    return { title, message, data: dataPayload };
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
   * Check if user should receive notification
   */
  private async shouldSendNotification(userId: string, category: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch notification preferences:', error);
        return true; // Default to sending if we can't check preferences
      }

      if (!preferences) {
        return true; // Default to sending if no preferences set
      }

      // Check if push notifications are enabled
      if (!preferences.push_notifications) {
        return false;
      }

      // Check category-specific preferences
      switch (category) {
        case 'booking_request':
        case 'booking_confirmed':
        case 'booking_cancelled':
        case 'booking_completed':
          return preferences.booking_notifications;
        case 'message_received':
          return preferences.message_notifications;
        case 'payment_received':
        case 'payment_failed':
          return preferences.payment_notifications;
        case 'review_received':
        case 'review_request':
          return preferences.review_notifications;
        case 'system_announcement':
        case 'reminder':
        case 'listing_approved':
        case 'listing_rejected':
          return preferences.system_notifications;
        default:
          return true;
      }
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to sending on error
    }
  }

  /**
   * Group tokens by platform
   */
  private groupTokensByPlatform(tokens: Array<{ token: string; platform: string; device_type: string }>) {
    return tokens.reduce((groups, token) => {
      const platform = token.platform;
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push(token);
      return groups;
    }, {} as Record<string, Array<{ token: string; platform: string; device_type: string }>>);
  }

  /**
   * Get priority number for app notifications
   */
  private getPriorityNumber(priority: FCMNotificationPriority): number {
    switch (priority) {
      case 'high': return 8;
      case 'normal': return 5;
      default: return 5;
    }
  }

  /**
   * Get Android notification channel ID
   */
  private getChannelId(category: string): string {
    switch (category) {
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_completed':
        return 'bookings';
      case 'message_received':
        return 'messages';
      case 'payment_received':
      case 'payment_failed':
        return 'payments';
      case 'review_received':
      case 'review_request':
        return 'reviews';
      case 'listing_approved':
      case 'listing_rejected':
        return 'listings';
      case 'system_announcement':
      case 'reminder':
        return 'system';
      default:
        return 'default';
    }
  }

  /**
   * Get iOS notification category ID
   */
  private getCategoryId(category: string): string {
    switch (category) {
      case 'booking_request':
        return 'BOOKING_REQUEST';
      case 'booking_confirmed':
        return 'BOOKING_CONFIRMED';
      case 'booking_cancelled':
        return 'BOOKING_CANCELLED';
      case 'booking_completed':
        return 'BOOKING_COMPLETED';
      case 'message_received':
        return 'MESSAGE_RECEIVED';
      case 'payment_received':
        return 'PAYMENT_RECEIVED';
      case 'payment_failed':
        return 'PAYMENT_FAILED';
      case 'review_received':
        return 'REVIEW_RECEIVED';
      case 'review_request':
        return 'REVIEW_REQUEST';
      case 'listing_approved':
        return 'LISTING_APPROVED';
      case 'listing_rejected':
        return 'LISTING_REJECTED';
      case 'system_announcement':
        return 'SYSTEM_ANNOUNCEMENT';
      case 'reminder':
        return 'REMINDER';
      default:
        return 'GENERAL';
    }
  }
}

// Export singleton instance
export const fcmNotificationService = new FCMNotificationService();

// Convenience functions for booking workflow (replaces BookingNotifications)
export const FCMBookingNotifications = {
  /**
   * Notify owner of new booking request
   */
  async notifyOwnerBookingRequest(
    ownerId: string,
    bookingId: string,
    listingTitle: string,
    renterName: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('booking_request', ownerId, {
      booking_id: bookingId,
      item_title: listingTitle,
      renter_name: renterName,
      duration: 1, // Default duration
    }, {
      priority: 'high',
    });
  },

  /**
   * Notify renter of booking approval
   */
  async notifyRenterBookingApproved(
    renterId: string,
    bookingId: string,
    listingTitle: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('booking_confirmed', renterId, {
      booking_id: bookingId,
      item_title: listingTitle,
      start_date: new Date().toISOString().split('T')[0],
    }, {
      priority: 'high',
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
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('booking_cancelled', renterId, {
      booking_id: bookingId,
      item_title: listingTitle,
      reason: reason || 'No reason provided',
    }, {
      priority: 'normal',
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
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('payment_received', userId, {
      booking_id: bookingId,
      item_title: listingTitle,
      amount,
    }, {
      priority: 'high',
    });
  },

  /**
   * Notify owner of completed booking (direct payment)
   */
  async notifyOwnerBookingCompleted(
    ownerId: string,
    bookingId: string,
    listingTitle: string,
    renterName: string,
    amount: number,
    startDate: string,
    endDate: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('booking_completed', ownerId, {
      booking_id: bookingId,
      item_title: listingTitle,
    }, {
      priority: 'high',
    });
  },

  /**
   * Send message notification
   */
  async notifyMessageReceived(
    userId: string,
    messageId: string,
    itemTitle: string,
    senderName: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('message_received', userId, {
      message_id: messageId,
      item_title: itemTitle,
      sender_name: senderName,
    }, {
      priority: 'normal',
    });
  },

  /**
   * Send payment failed notification
   */
  async notifyPaymentFailed(
    userId: string,
    bookingId: string,
    itemTitle: string,
    errorMessage: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('payment_failed', userId, {
      booking_id: bookingId,
      item_title: itemTitle,
      error_message: errorMessage,
    }, {
      priority: 'high',
    });
  },

  /**
   * Send review request notification
   */
  async notifyReviewRequest(
    userId: string,
    bookingId: string,
    itemTitle: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('review_request', userId, {
      booking_id: bookingId,
      item_title: itemTitle,
    }, {
      priority: 'normal',
    });
  },

  /**
   * Send system announcement
   */
  async notifySystemAnnouncement(
    userId: string,
    announcementText: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('system_announcement', userId, {
      announcement_text: announcementText,
    }, {
      priority: 'normal',
    });
  },

  /**
   * Send reminder notification
   */
  async notifyReminder(
    userId: string,
    reminderText: string
  ): Promise<FCMNotificationResult> {
    return fcmNotificationService.sendTypedNotification('reminder', userId, {
      reminder_text: reminderText,
    }, {
      priority: 'normal',
    });
  },
};

