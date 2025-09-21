import { createClient } from '@/lib/supabase/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export interface FCMNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

export interface IssueReportNotificationData {
  reportId: string;
  bookingId: string;
  reporterName: string;
  reporterRole: 'owner' | 'renter';
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  listingTitle: string;
  financialImpact: boolean;
  estimatedCost: number;
}

export class FCMNotificationService {
  private static instance: FCMNotificationService;
  private messaging: any = null;
  private isConfigured = false;

  private constructor() {
    this.initializeFirebaseAdmin();
  }

  private initializeFirebaseAdmin() {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (!projectId || !privateKey || !clientEmail) {
        console.warn('Firebase Admin SDK not configured - FCM notifications disabled');
        console.warn('Missing:', {
          projectId: !projectId,
          privateKey: !privateKey,
          clientEmail: !clientEmail
        });
        return;
      }

      // Initialize Firebase Admin SDK if not already initialized
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
      }

      this.messaging = getMessaging();
      this.isConfigured = true;
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      this.isConfigured = false;
    }
  }

  public static getInstance(): FCMNotificationService {
    if (!FCMNotificationService.instance) {
      FCMNotificationService.instance = new FCMNotificationService();
    }
    return FCMNotificationService.instance;
  }

  async sendToAdmins(notification: FCMNotificationData): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'FCM not configured' };
    }

    try {
      const supabase = createClient();
      
      // Get all admin FCM tokens
      const { data: adminTokens, error } = await supabase
        .from('fcm_subscriptions')
        .select('fcm_token, user_id, profiles!inner(role)')
        .eq('is_active', true)
        .eq('profiles.role', 'admin');

      if (error) {
        console.error('Error fetching admin FCM tokens:', error);
        return { success: false, error: 'Failed to fetch admin tokens' };
      }

      if (!adminTokens || adminTokens.length === 0) {
        console.warn('No admin FCM tokens found');
        return { success: false, error: 'No admin tokens available' };
      }

      const tokens = adminTokens.map(t => t.fcm_token);
      const result = await this.sendMulticast(tokens, notification);
      
      // Log notification to history
      await this.logNotificationHistory(adminTokens.map(t => t.user_id), notification, result);
      
      return result;
    } catch (error) {
      console.error('Error sending admin FCM notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendIssueReportNotification(data: IssueReportNotificationData): Promise<{ success: boolean; error?: string }> {
    // Only send real-time notifications for high and critical severity issues
    if (data.severity !== 'high' && data.severity !== 'critical') {
      return { success: true }; // Skip notification but don't treat as error
    }

    const notification: FCMNotificationData = {
      title: `🚨 ${this.getSeverityEmoji(data.severity)} Urgent Issue Report`,
      body: `${data.title} - ${data.listingTitle} (${data.reporterRole}: ${data.reporterName})`,
      data: {
        type: 'issue_report',
        reportId: data.reportId,
        bookingId: data.bookingId,
        severity: data.severity,
        issueType: data.issueType,
        financialImpact: data.financialImpact.toString(),
        estimatedCost: data.estimatedCost.toString(),
      },
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/issue-reports?report=${data.reportId}`,
    };

    return await this.sendToAdmins(notification);
  }

  private async sendMulticast(tokens: string[], notification: FCMNotificationData): Promise<{ success: boolean; error?: string; results?: any[] }> {
    try {
      if (!this.messaging) {
        return { success: false, error: 'Firebase messaging not initialized' };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          ...notification.data,
          click_action: notification.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'admin_alerts',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
            defaultLightSettings: true,
            clickAction: notification.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
              'content-available': 1,
            },
          },
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
          },
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            title: notification.title,
            body: notification.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            image: notification.imageUrl,
            requireInteraction: true,
            actions: [
              {
                action: 'view',
                title: 'View Report',
                icon: '/icons/view-icon.png',
              },
              {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icons/dismiss-icon.png',
              },
            ],
            data: {
              url: notification.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
            },
          },
        },
        tokens: tokens,
      };

      const response = await this.messaging.sendEachForMulticast(message);

      // Handle partial failures
      if (response.failureCount > 0) {
        console.warn(`FCM partial failure: ${response.failureCount}/${tokens.length} failed`);
        // Clean up invalid tokens
        await this.handleFailedTokensV2(tokens, response.responses);
      }

      return { 
        success: response.successCount > 0, 
        results: response.responses,
        error: response.failureCount === tokens.length ? 'All tokens failed' : undefined
      };

    } catch (error) {
      console.error('FCM multicast error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async handleFailedTokens(tokens: string[], results: any[]): Promise<void> {
    try {
      const supabase = createClient();
      const tokensToDeactivate: string[] = [];

      results.forEach((result, index) => {
        if (result.error) {
          const errorCode = result.error;
          // Deactivate tokens that are invalid or unregistered
          if (errorCode === 'InvalidRegistration' || 
              errorCode === 'NotRegistered' || 
              errorCode === 'MismatchSenderId') {
            tokensToDeactivate.push(tokens[index]);
          }
        }
      });

      if (tokensToDeactivate.length > 0) {
        await supabase
          .from('fcm_subscriptions')
          .update({ is_active: false })
          .in('fcm_token', tokensToDeactivate);
        
        console.log(`Deactivated ${tokensToDeactivate.length} invalid FCM tokens`);
      }
    } catch (error) {
      console.error('Error handling failed tokens:', error);
    }
  }

  private async handleFailedTokensV2(tokens: string[], responses: any[]): Promise<void> {
    try {
      const supabase = createClient();
      const tokensToDeactivate: string[] = [];

      responses.forEach((response, index) => {
        if (!response.success && response.error) {
          const errorCode = response.error.code;
          // Deactivate tokens that are invalid or unregistered
          if (errorCode === 'messaging/invalid-registration-token' || 
              errorCode === 'messaging/registration-token-not-registered' || 
              errorCode === 'messaging/mismatched-credential') {
            tokensToDeactivate.push(tokens[index]);
          }
        }
      });

      if (tokensToDeactivate.length > 0) {
        await supabase
          .from('fcm_subscriptions')
          .update({ is_active: false })
          .in('fcm_token', tokensToDeactivate);
        
        console.log(`Deactivated ${tokensToDeactivate.length} invalid FCM tokens`);
      }
    } catch (error) {
      console.error('Error handling failed tokens V2:', error);
    }
  }

  private async logNotificationHistory(
    userIds: string[], 
    notification: FCMNotificationData, 
    result: { success: boolean; error?: string }
  ): Promise<void> {
    try {
      const supabase = createClient();
      
      const historyRecords = userIds.map(userId => ({
        user_id: userId,
        type: 'admin_alert',
        title: notification.title,
        message: notification.body,
        platform: 'fcm',
        delivery_method: 'push',
        delivery_status: result.success ? 'sent' : 'failed',
        error_message: result.error,
        metadata: {
          notification_data: notification.data,
          action_url: notification.actionUrl,
        },
        sent_at: new Date().toISOString(),
      }));

      await supabase
        .from('notification_history')
        .insert(historyRecords);

    } catch (error) {
      console.error('Error logging notification history:', error);
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  // Utility method to register admin FCM tokens
  async registerAdminToken(userId: string, token: string, platform: 'web' | 'ios' | 'android'): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!profile || profile.role !== 'admin') {
        return { success: false, error: 'User is not an admin' };
      }

      // Upsert FCM token
      const { error } = await supabase
        .from('fcm_subscriptions')
        .upsert({
          user_id: userId,
          fcm_token: token,
          platform,
          device_type: platform,
          is_active: true,
          last_active: new Date().toISOString(),
        }, {
          onConflict: 'fcm_token'
        });

      if (error) {
        console.error('Error registering FCM token:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in registerAdminToken:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Method to send test notification to admins
  async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    const testNotification: FCMNotificationData = {
      title: '🧪 Test Admin Notification',
      body: 'This is a test notification to verify FCM is working correctly.',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
    };

    return await this.sendToAdmins(testNotification);
  }
}

export const fcmService = FCMNotificationService.getInstance();
