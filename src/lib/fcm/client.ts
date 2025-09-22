/**
 * Firebase Cloud Messaging (FCM) Client Service
 * 
 * Client-side FCM implementation for web browser notifications
 * Handles token registration, permission requests, and message handling
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported,
  type Messaging,
  type MessagePayload 
} from 'firebase/messaging';

// Firebase configuration from MCP Firebase SDK config
const firebaseConfig = {
  projectId: "rent-it-forward",
  appId: "1:793254315983:web:0ebecd3361ddb687b2f4ba",
  storageBucket: "rent-it-forward.firebasestorage.app",
  apiKey: "AIzaSyDhvS1ehe17M4n9tLRglTOdilNFoeHoAhk",
  authDomain: "rent-it-forward.firebaseapp.com",
  messagingSenderId: "793254315983",
  measurementId: "G-QDDX5CQFHJ"
};

// VAPID key for web push (you'll need to generate this in Firebase Console)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

class FCMClientService {
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private isInitialized = false;
  private currentToken: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Check if Firebase is supported
      const supported = await isSupported();
      if (!supported) {
        console.warn('Firebase messaging is not supported in this browser');
        return;
      }

      // Initialize Firebase app
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.app = existingApps[0];
      } else {
        this.app = initializeApp(firebaseConfig);
      }

      // Initialize messaging (only in browser environment)
      if (typeof window !== 'undefined') {
        this.messaging = getMessaging(this.app);
        this.setupMessageListener();
        this.isInitialized = true;
        console.log('FCM Client initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize FCM Client:', error);
    }
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermissionAndGetToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.isInitialized || !this.messaging) {
      return { success: false, error: 'FCM not initialized' };
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission denied' };
      }

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY,
      });

      if (token) {
        this.currentToken = token;
        console.log('FCM token obtained:', token);
        return { success: true, token };
      } else {
        return { success: false, error: 'No registration token available' };
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current FCM token without requesting permission
   */
  async getCurrentToken(): Promise<string | null> {
    if (!this.isInitialized || !this.messaging) {
      return null;
    }

    try {
      if (Notification.permission !== 'granted') {
        return null;
      }

      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY,
      });

      this.currentToken = token;
      return token;
    } catch (error) {
      console.error('Error getting current FCM token:', error);
      return null;
    }
  }

  /**
   * Check if notifications are supported and permission is granted
   */
  async isNotificationSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const supported = await isSupported();
    return supported && 'Notification' in window;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Register FCM token with backend
   */
  async registerToken(userId: string): Promise<{ success: boolean; error?: string }> {
    const tokenResult = await this.requestPermissionAndGetToken();
    
    if (!tokenResult.success || !tokenResult.token) {
      return { success: false, error: tokenResult.error };
    }

    try {
      const response = await fetch('/api/notifications/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcm_token: tokenResult.token,
          platform: 'web',
          device_type: 'web',
          device_id: this.getDeviceId(),
          app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to register token' };
      }

      console.log('FCM token registered successfully');
      return { success: true };
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Unregister FCM token from backend
   */
  async unregisterToken(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentToken) {
      return { success: true }; // Already unregistered
    }

    try {
      const response = await fetch('/api/notifications/fcm-token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcm_token: this.currentToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to unregister token' };
      }

      this.currentToken = null;
      console.log('FCM token unregistered successfully');
      return { success: true };
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Set up foreground message listener
   */
  private setupMessageListener(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload: MessagePayload) => {
      console.log('Foreground message received:', payload);
      
      // Handle the message in the foreground
      this.handleForegroundMessage(payload);
    });
  }

  /**
   * Handle foreground messages
   */
  private handleForegroundMessage(payload: MessagePayload): void {
    const { notification, data } = payload;
    
    if (!notification) return;

    // Create and show notification
    if (Notification.permission === 'granted') {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icons/notification-icon-192.png',
        image: notification.image,
        badge: '/icons/notification-badge-72.png',
        tag: data?.type || 'general',
        requireInteraction: data?.priority === 'high',
        data: data,
        actions: this.getNotificationActions(data?.type),
      };

      const notif = new Notification(notification.title || 'Notification', notificationOptions);
      
      // Handle notification click
      notif.onclick = () => {
        window.focus();
        notif.close();
        
        // Navigate to action URL if provided
        if (data?.action_url) {
          window.location.href = data.action_url;
        }
        
        // Mark as clicked in analytics
        this.trackNotificationClick(data?.fcm_message_id);
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notif.close();
      }, 10000);
    }

    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('fcm-message', {
      detail: { payload, timestamp: Date.now() }
    }));
  }

  /**
   * Get notification actions based on type
   */
  private getNotificationActions(type?: string): NotificationAction[] {
    switch (type) {
      case 'booking_request':
        return [
          { action: 'approve', title: 'Approve', icon: '/icons/check.png' },
          { action: 'reject', title: 'Reject', icon: '/icons/x.png' },
        ];
      case 'message_received':
        return [
          { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
          { action: 'view', title: 'View', icon: '/icons/eye.png' },
        ];
      default:
        return [
          { action: 'view', title: 'View', icon: '/icons/eye.png' },
        ];
    }
  }

  /**
   * Track notification click for analytics
   */
  private async trackNotificationClick(messageId?: string): Promise<void> {
    if (!messageId) return;

    try {
      await fetch('/api/notifications/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcm_message_id: messageId,
          delivery_status: 'clicked',
          clicked_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error tracking notification click:', error);
    }
  }

  /**
   * Generate a unique device ID for this browser
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('fcm_device_id');
    
    if (!deviceId) {
      deviceId = 'web_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('fcm_device_id', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Check if FCM is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.messaging !== null;
  }

  /**
   * Get current token (cached)
   */
  getCachedToken(): string | null {
    return this.currentToken;
  }
}

// Export singleton instance
export const fcmClientService = new FCMClientService();

// Export types for use in components
export type { MessagePayload };

// Helper functions for React components
export const useFCMSupport = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const checkSupport = async () => {
      const supported = await fcmClientService.isNotificationSupported();
      setIsSupported(supported);
      setPermission(fcmClientService.getPermissionStatus());
    };

    checkSupport();

    // Listen for permission changes
    const handleVisibilityChange = () => {
      setPermission(fcmClientService.getPermissionStatus());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return { isSupported, permission };
};

// React hook imports (add these imports at the top)
import { useState, useEffect } from 'react';
