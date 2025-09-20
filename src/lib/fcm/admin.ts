/**
 * Firebase Cloud Messaging (FCM) Admin Service
 * 
 * Server-side FCM implementation using Firebase Admin SDK
 * Replaces OneSignal for push notifications
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging, type Message, type MulticastMessage } from 'firebase-admin/messaging';
import { createClient } from '@/lib/supabase/server';

// FCM Admin configuration
interface FCMAdminConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

// FCM notification payload
export interface FCMNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  badge?: string;
  sound?: string;
  clickAction?: string;
}

// FCM data payload (custom data)
export interface FCMDataPayload {
  [key: string]: string;
}

// FCM message options
export interface FCMMessageOptions {
  notification?: FCMNotificationPayload;
  data?: FCMDataPayload;
  webpush?: {
    headers?: { [key: string]: string };
    data?: { [key: string]: string };
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      image?: string;
      badge?: string;
      tag?: string;
      requireInteraction?: boolean;
      silent?: boolean;
      timestamp?: number;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    };
    fcmOptions?: {
      link?: string;
      analyticsLabel?: string;
    };
  };
  android?: {
    priority?: 'normal' | 'high';
    ttl?: number;
    collapseKey?: string;
    restrictedPackageName?: string;
    data?: { [key: string]: string };
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      color?: string;
      sound?: string;
      tag?: string;
      clickAction?: string;
      bodyLocKey?: string;
      bodyLocArgs?: string[];
      titleLocKey?: string;
      titleLocArgs?: string[];
      channelId?: string;
      ticker?: string;
      sticky?: boolean;
      eventTime?: string;
      localOnly?: boolean;
      notificationPriority?: 'PRIORITY_MIN' | 'PRIORITY_LOW' | 'PRIORITY_DEFAULT' | 'PRIORITY_HIGH' | 'PRIORITY_MAX';
      defaultSound?: boolean;
      defaultVibrateTimings?: boolean;
      defaultLightSettings?: boolean;
      vibrateTimings?: string[];
      visibility?: 'PRIVATE' | 'PUBLIC' | 'SECRET';
      notificationCount?: number;
      image?: string;
    };
  };
  apns?: {
    headers?: { [key: string]: string };
    payload?: {
      aps?: {
        alert?: string | {
          title?: string;
          subtitle?: string;
          body?: string;
          launchImage?: string;
          titleLocKey?: string;
          titleLocArgs?: string[];
          subtitleLocKey?: string;
          subtitleLocArgs?: string[];
          locKey?: string;
          locArgs?: string[];
        };
        badge?: number;
        sound?: string | {
          critical?: boolean;
          name?: string;
          volume?: number;
        };
        threadId?: string;
        category?: string;
        contentAvailable?: boolean;
        mutableContent?: boolean;
      };
      [key: string]: any;
    };
    fcmOptions?: {
      analyticsLabel?: string;
      image?: string;
    };
  };
  condition?: string;
  topic?: string;
}

// FCM send result
export interface FCMSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  failureCount?: number;
  successCount?: number;
  responses?: Array<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

class FCMAdminService {
  private app: App | null = null;
  private messaging: Messaging | null = null;
  private config: FCMAdminConfig;

  constructor() {
    this.config = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    };

    this.initialize();
  }

  private initialize(): void {
    try {
      // Check if Firebase app is already initialized
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.app = existingApps[0];
      } else {
        // Initialize Firebase Admin SDK
        this.app = initializeApp({
          credential: cert({
            projectId: this.config.projectId,
            privateKey: this.config.privateKey,
            clientEmail: this.config.clientEmail,
          }),
          projectId: this.config.projectId,
        });
      }

      this.messaging = getMessaging(this.app);
      console.log('FCM Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FCM Admin SDK:', error);
      throw error;
    }
  }

  /**
   * Send notification to a single FCM token
   */
  async sendToToken(
    token: string,
    options: FCMMessageOptions
  ): Promise<FCMSendResult> {
    if (!this.messaging) {
      throw new Error('FCM Admin SDK not initialized');
    }

    try {
      const message: Message = {
        token,
        ...options,
      };

      const messageId = await this.messaging.send(message);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to send FCM message to token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification to multiple FCM tokens
   */
  async sendToTokens(
    tokens: string[],
    options: FCMMessageOptions
  ): Promise<FCMSendResult> {
    if (!this.messaging) {
      throw new Error('FCM Admin SDK not initialized');
    }

    if (tokens.length === 0) {
      return {
        success: false,
        error: 'No tokens provided',
        failureCount: 0,
        successCount: 0,
      };
    }

    try {
      const message: MulticastMessage = {
        tokens,
        ...options,
      };

      const response = await this.messaging.sendEachForMulticast(message);

      const responses = response.responses.map((resp, index) => ({
        success: resp.success,
        messageId: resp.messageId,
        error: resp.error?.message,
        token: tokens[index],
      }));

      return {
        success: response.failureCount === 0,
        failureCount: response.failureCount,
        successCount: response.successCount,
        responses,
      };
    } catch (error) {
      console.error('Failed to send FCM multicast message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        failureCount: tokens.length,
        successCount: 0,
      };
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    options: FCMMessageOptions
  ): Promise<FCMSendResult> {
    if (!this.messaging) {
      throw new Error('FCM Admin SDK not initialized');
    }

    try {
      const message: Message = {
        topic,
        ...options,
      };

      const messageId = await this.messaging.send(message);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to send FCM message to topic:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification to a condition (complex topic expression)
   */
  async sendToCondition(
    condition: string,
    options: FCMMessageOptions
  ): Promise<FCMSendResult> {
    if (!this.messaging) {
      throw new Error('FCM Admin SDK not initialized');
    }

    try {
      const message: Message = {
        condition,
        ...options,
      };

      const messageId = await this.messaging.send(message);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to send FCM message to condition:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.messaging) {
      throw new Error('FCM Admin SDK not initialized');
    }

    try {
      await this.messaging.subscribeToTopic(tokens, topic);
      console.log(`Successfully subscribed ${tokens.length} tokens to topic: ${topic}`);
    } catch (error) {
      console.error('Failed to subscribe tokens to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.messaging) {
      throw new Error('FCM Admin SDK not initialized');
    }

    try {
      await this.messaging.unsubscribeFromTopic(tokens, topic);
      console.log(`Successfully unsubscribed ${tokens.length} tokens from topic: ${topic}`);
    } catch (error) {
      console.error('Failed to unsubscribe tokens from topic:', error);
      throw error;
    }
  }

  /**
   * Get user's FCM tokens from database
   */
  async getUserFCMTokens(userId: string): Promise<Array<{
    token: string;
    platform: string;
    device_type: string;
  }>> {
    try {
      const supabase = await createClient();
      
      const { data: tokens, error } = await supabase
        .from('fcm_subscriptions')
        .select('fcm_token, platform, device_type')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Failed to fetch user FCM tokens:', error);
        return [];
      }

      return tokens.map(token => ({
        token: token.fcm_token,
        platform: token.platform,
        device_type: token.device_type,
      }));
    } catch (error) {
      console.error('Error fetching user FCM tokens:', error);
      return [];
    }
  }

  /**
   * Log notification in database
   */
  async logNotification(
    userId: string,
    messageId: string,
    notificationType: string,
    title: string,
    message: string,
    platform: string,
    fcmToken: string,
    status: 'sent' | 'failed' = 'sent',
    errorMessage?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          notification_type: notificationType,
          title,
          message,
          delivery_method: 'push',
          delivery_status: status,
          fcm_message_id: messageId,
          fcm_token: fcmToken,
          platform,
          error_message: errorMessage,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        });
    } catch (error) {
      console.error('Failed to log FCM notification:', error);
    }
  }

  /**
   * Create in-app notification record
   */
  async createAppNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    actionUrl?: string,
    data?: Record<string, any>,
    priority: number = 5
  ): Promise<string | null> {
    try {
      const supabase = await createClient();
      
      const { data: notification, error } = await supabase
        .from('app_notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          action_url: actionUrl,
          data: data || {},
          priority,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create app notification:', error);
        return null;
      }

      return notification.id;
    } catch (error) {
      console.error('Error creating app notification:', error);
      return null;
    }
  }

  /**
   * Clean up invalid FCM tokens
   */
  async cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
    if (invalidTokens.length === 0) return;

    try {
      const supabase = await createClient();
      
      await supabase
        .from('fcm_subscriptions')
        .update({ is_active: false })
        .in('fcm_token', invalidTokens);

      console.log(`Marked ${invalidTokens.length} FCM tokens as inactive`);
    } catch (error) {
      console.error('Failed to cleanup invalid FCM tokens:', error);
    }
  }
}

// Export singleton instance
export const fcmAdminService = new FCMAdminService();

// Helper function to build platform-specific FCM message
export function buildFCMMessage(
  title: string,
  body: string,
  data?: Record<string, string>,
  options?: {
    imageUrl?: string;
    clickAction?: string;
    icon?: string;
    badge?: string;
    sound?: string;
    priority?: 'normal' | 'high';
    ttl?: number;
    collapseKey?: string;
    channelId?: string;
    category?: string;
  }
): FCMMessageOptions {
  const message: FCMMessageOptions = {
    notification: {
      title,
      body,
      imageUrl: options?.imageUrl,
      icon: options?.icon || '/icons/notification-icon-192.png',
      badge: options?.badge || '/icons/notification-badge-72.png',
      sound: options?.sound || 'default',
      clickAction: options?.clickAction,
    },
    data: data || {},
  };

  // Web-specific configuration
  message.webpush = {
    notification: {
      title,
      body,
      icon: options?.icon || '/icons/notification-icon-192.png',
      image: options?.imageUrl,
      badge: options?.badge || '/icons/notification-badge-72.png',
      tag: data?.type || 'general',
      requireInteraction: options?.priority === 'high',
      timestamp: Date.now(),
    },
    fcmOptions: {
      link: options?.clickAction,
    },
  };

  // Android-specific configuration
  message.android = {
    priority: options?.priority || 'normal',
    ttl: options?.ttl ? options.ttl * 1000 : 86400000, // 24 hours default
    collapseKey: options?.collapseKey,
    notification: {
      title,
      body,
      icon: 'notification_icon',
      color: '#44D62C', // Brand color
      sound: options?.sound || 'default',
      channelId: options?.channelId || getAndroidChannelId(data?.type),
      clickAction: options?.clickAction,
      image: options?.imageUrl,
      notificationPriority: options?.priority === 'high' ? 'PRIORITY_HIGH' : 'PRIORITY_DEFAULT',
      defaultSound: true,
      defaultVibrateTimings: true,
    },
  };

  // iOS-specific configuration (APNS)
  message.apns = {
    headers: {
      'apns-priority': options?.priority === 'high' ? '10' : '5',
      ...(options?.ttl && {
        'apns-expiration': String(Math.floor(Date.now() / 1000) + options.ttl)
      }),
    },
    payload: {
      aps: {
        alert: {
          title,
          body,
        },
        badge: 1, // Will be updated by the app
        sound: options?.sound || 'default',
        category: options?.category || getIOSCategoryId(data?.type),
        mutableContent: true, // Enable notification service extension
      },
    },
    fcmOptions: {
      image: options?.imageUrl,
    },
  };

  return message;
}

// Helper function to get Android notification channel ID
function getAndroidChannelId(notificationType?: string): string {
  switch (notificationType) {
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

// Helper function to get iOS notification category ID
function getIOSCategoryId(notificationType?: string): string {
  switch (notificationType) {
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

