'use client';

import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { initializeApp, getApps } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export class FCMClientService {
  private static instance: FCMClientService;
  private messaging: any = null;
  private isSupported = false;

  private constructor() {
    this.initializeMessaging();
  }

  public static getInstance(): FCMClientService {
    if (!FCMClientService.instance) {
      FCMClientService.instance = new FCMClientService();
    }
    return FCMClientService.instance;
  }

  private async initializeMessaging() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return;
      }

      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers not supported');
        return;
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return;
      }

      this.messaging = getMessaging(app);
      this.isSupported = true;

      // Set up message listener for foreground messages
      this.setupMessageListener();

    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  private setupMessageListener() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload: MessagePayload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification if the page is visible
      if (document.visibilityState === 'visible') {
        this.showNotification(payload);
      }
    });
  }

  private showNotification(payload: MessagePayload) {
    const { notification, data } = payload;
    
    if (!notification?.title) return;

    // Create notification options
    const options: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: notification.image,
      data: data,
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
    };

    // Show the notification
    if (Notification.permission === 'granted') {
      const notif = new Notification(notification.title, options);
      
      notif.onclick = () => {
        window.focus();
        if (data?.click_action || data?.url) {
          window.open(data.click_action || data.url, '_blank');
        }
        notif.close();
      };
    }
  }

  async requestPermission(): Promise<{ success: boolean; permission?: NotificationPermission; error?: string }> {
    try {
      if (!this.isSupported) {
        return { success: false, error: 'FCM not supported in this browser' };
      }

      const permission = await Notification.requestPermission();
      
      return {
        success: permission === 'granted',
        permission,
        error: permission !== 'granted' ? 'Permission denied' : undefined,
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      if (!this.isSupported || !this.messaging) {
        return { success: false, error: 'FCM not supported or initialized' };
      }

      if (Notification.permission !== 'granted') {
        return { success: false, error: 'Notification permission not granted' };
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const tokenOptions = vapidKey && vapidKey !== 'YOUR_VAPID_KEY_HERE' 
        ? { vapidKey } 
        : {};
      
      const token = await getToken(this.messaging, tokenOptions);

      if (!token) {
        return { success: false, error: 'Failed to get FCM token' };
      }

      return { success: true, token };
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async registerToken(): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenResult = await this.getToken();
      
      if (!tokenResult.success || !tokenResult.token) {
        return { success: false, error: tokenResult.error };
      }

      // Register token with backend
      const response = await fetch('/api/admin/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenResult.token,
          platform: 'web',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to register token' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async unregisterToken(): Promise<{ success: boolean; error?: string }> {
    try {
      const tokenResult = await this.getToken();
      
      if (!tokenResult.success || !tokenResult.token) {
        return { success: false, error: tokenResult.error };
      }

      // Unregister token with backend
      const response = await fetch('/api/admin/fcm-token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenResult.token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to unregister token' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getPermissionStatus(): NotificationPermission | null {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }
    return Notification.permission;
  }

  isNotificationSupported(): boolean {
    return this.isSupported;
  }
}

export const fcmClient = FCMClientService.getInstance();
