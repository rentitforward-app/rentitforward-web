/**
 * OneSignal Client Service for Web Push Notifications
 * 
 * Handles OneSignal SDK initialization, user subscription management,
 * and notification sending for the booking workflow
 */

'use client';

import { ONESIGNAL_CONFIG, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './config';

// OneSignal SDK types (simplified)
interface OneSignal {
  init(config: any): Promise<void>;
  showSlidedownPrompt(): Promise<void>;
  isPushNotificationsEnabled(): Promise<boolean>;
  getNotificationPermission(): Promise<string>;
  getUserId(): Promise<string | null>;
  getRegistrationId(): Promise<string | null>;
  setEmail(email: string): Promise<void>;
  removeEmail(): Promise<void>;
  sendTag(key: string, value: string): void;
  deleteTag(key: string): void;
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
  showNativePrompt(): Promise<void>;
}

declare global {
  interface Window {
    OneSignal?: OneSignal;
  }
}

class OneSignalService {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize OneSignal SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeSDK();
    return this.initPromise;
  }

  private async initializeSDK(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Load OneSignal SDK
      if (!window.OneSignal) {
        await this.loadSDK();
      }

      if (!window.OneSignal) {
        throw new Error('OneSignal SDK failed to load');
      }

      // Initialize OneSignal
      await window.OneSignal.init({
        appId: ONESIGNAL_CONFIG.appId,
        allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
        requiresUserPrivacyConsent: ONESIGNAL_CONFIG.requiresUserPrivacyConsent,
        promptOptions: ONESIGNAL_CONFIG.promptOptions,
      });

      this.isInitialized = true;
      console.log('OneSignal initialized successfully');

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('OneSignal initialization failed:', error);
      throw error;
    }
  }

  private async loadSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
      document.head.appendChild(script);
    });
  }

  private setupEventListeners(): void {
    if (!window.OneSignal) return;

    // Listen for subscription changes
    window.OneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
      console.log('OneSignal subscription changed:', isSubscribed);
      this.onSubscriptionChange(isSubscribed);
    });

    // Listen for notification permission changes
    window.OneSignal.on('notificationPermissionChange', (permission: string) => {
      console.log('OneSignal permission changed:', permission);
      this.onPermissionChange(permission);
    });
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    await this.initialize();
    if (!window.OneSignal) return false;

    try {
      await window.OneSignal.showSlidedownPrompt();
      const permission = await window.OneSignal.getNotificationPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Check if push notifications are enabled
   */
  async isPushEnabled(): Promise<boolean> {
    await this.initialize();
    if (!window.OneSignal) return false;

    try {
      return await window.OneSignal.isPushNotificationsEnabled();
    } catch (error) {
      console.error('Failed to check push notification status:', error);
      return false;
    }
  }

  /**
   * Get user's OneSignal player ID
   */
  async getPlayerId(): Promise<string | null> {
    await this.initialize();
    if (!window.OneSignal) return null;

    try {
      return await window.OneSignal.getUserId();
    } catch (error) {
      console.error('Failed to get OneSignal user ID:', error);
      return null;
    }
  }

  /**
   * Get push token for mobile compatibility
   */
  async getPushToken(): Promise<string | null> {
    await this.initialize();
    if (!window.OneSignal) return null;

    try {
      return await window.OneSignal.getRegistrationId();
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Set user email for email fallback notifications
   */
  async setUserEmail(email: string): Promise<void> {
    await this.initialize();
    if (!window.OneSignal) return;

    try {
      await window.OneSignal.setEmail(email);
    } catch (error) {
      console.error('Failed to set user email:', error);
    }
  }

  /**
   * Remove user email
   */
  async removeUserEmail(): Promise<void> {
    await this.initialize();
    if (!window.OneSignal) return;

    try {
      await window.OneSignal.removeEmail();
    } catch (error) {
      console.error('Failed to remove user email:', error);
    }
  }

  /**
   * Set user tags for targeted notifications
   */
  async setUserTags(tags: Record<string, string>): Promise<void> {
    await this.initialize();
    if (!window.OneSignal) return;

    try {
      Object.entries(tags).forEach(([key, value]) => {
        window.OneSignal!.sendTag(key, value);
      });
    } catch (error) {
      console.error('Failed to set user tags:', error);
    }
  }

  /**
   * Remove user tags
   */
  async removeUserTags(tagKeys: string[]): Promise<void> {
    await this.initialize();
    if (!window.OneSignal) return;

    try {
      tagKeys.forEach(key => {
        window.OneSignal!.deleteTag(key);
      });
    } catch (error) {
      console.error('Failed to remove user tags:', error);
    }
  }

  /**
   * Handle subscription changes
   */
  private async onSubscriptionChange(isSubscribed: boolean): Promise<void> {
    if (isSubscribed) {
      const playerId = await this.getPlayerId();
      if (playerId) {
        // Update user's player ID in database
        await this.updatePlayerIdInDatabase(playerId);
      }
    } else {
      // Remove player ID from database
      await this.removePlayerIdFromDatabase();
    }
  }

  /**
   * Handle permission changes
   */
  private onPermissionChange(permission: string): void {
    // Log permission changes for analytics
    console.log('Notification permission:', permission);
  }

  /**
   * Update player ID in database
   */
  private async updatePlayerIdInDatabase(playerId: string): Promise<void> {
    try {
      await fetch('/api/notifications/player-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId, 
          platform: 'web',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to update player ID in database:', error);
    }
  }

  /**
   * Remove player ID from database
   */
  private async removePlayerIdFromDatabase(): Promise<void> {
    try {
      await fetch('/api/notifications/player-id', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'web' }),
      });
    } catch (error) {
      console.error('Failed to remove player ID from database:', error);
    }
  }

  /**
   * Get current notification permission status
   */
  async getPermissionStatus(): Promise<string> {
    await this.initialize();
    if (!window.OneSignal) return 'unsupported';

    try {
      return await window.OneSignal.getNotificationPermission();
    } catch (error) {
      console.error('Failed to get permission status:', error);
      return 'denied';
    }
  }

  /**
   * Show native browser notification prompt
   */
  async showNativePrompt(): Promise<void> {
    await this.initialize();
    if (!window.OneSignal) return;

    try {
      await window.OneSignal.showNativePrompt();
    } catch (error) {
      console.error('Failed to show native prompt:', error);
    }
  }
}

// Export singleton instance
export const oneSignalService = new OneSignalService();

// Export utilities for React components
export const useOneSignal = () => {
  return oneSignalService;
};