import OneSignal from 'react-onesignal';
import { 
  createPushNotification, 
  shouldSendNotification,
  NotificationPreferences 
} from '@rentitforward/shared/src';

export interface OneSignalConfig {
  appId: string;
  allowLocalhostAsSecureOrigin?: boolean;
  requiresUserPrivacyConsent?: boolean;
  promptOptions?: {
    slidedown?: {
      enabled?: boolean;
      autoPrompt?: boolean;
      timeDelay?: number;
      pageViews?: number;
    };
    customlink?: {
      enabled?: boolean;
      style?: 'button' | 'link';
      size?: 'small' | 'medium' | 'large';
      color?: {
        button?: string;
        text?: string;
      };
      text?: {
        subscribe?: string;
        unsubscribe?: string;
        explanation?: string;
      };
    };
  };
  welcomeNotification?: {
    disable?: boolean;
    title?: string;
    message?: string;
    url?: string;
  };
  notificationClickHandlerMatch?: string;
  notificationClickHandlerAction?: string;
}

export class OneSignalService {
  private isInitialized = false;
  private appId: string;
  private config: OneSignalConfig;

  constructor(config: OneSignalConfig) {
    this.appId = config.appId;
    this.config = config;
  }

  /**
   * Initialize OneSignal
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('OneSignal already initialized');
      return;
    }

    try {
      await OneSignal.init({
        appId: this.appId,
        allowLocalhostAsSecureOrigin: this.config.allowLocalhostAsSecureOrigin || false,
        requiresUserPrivacyConsent: this.config.requiresUserPrivacyConsent || false,
        
        // Configure prompts
        promptOptions: {
          slidedown: {
            enabled: this.config.promptOptions?.slidedown?.enabled ?? false,
            autoPrompt: this.config.promptOptions?.slidedown?.autoPrompt ?? false,
            timeDelay: this.config.promptOptions?.slidedown?.timeDelay ?? 3,
            pageViews: this.config.promptOptions?.slidedown?.pageViews ?? 1,
          },
          customlink: {
            enabled: this.config.promptOptions?.customlink?.enabled ?? true,
            style: this.config.promptOptions?.customlink?.style ?? 'button',
            size: this.config.promptOptions?.customlink?.size ?? 'medium',
            color: {
              button: this.config.promptOptions?.customlink?.color?.button ?? '#44D62C',
              text: this.config.promptOptions?.customlink?.color?.text ?? '#ffffff',
            },
            text: {
              subscribe: this.config.promptOptions?.customlink?.text?.subscribe ?? 'Subscribe to notifications',
              unsubscribe: this.config.promptOptions?.customlink?.text?.unsubscribe ?? 'Unsubscribe from notifications',
              explanation: this.config.promptOptions?.customlink?.text?.explanation ?? 'Get notified about booking updates and messages',
            },
          },
        },

        // Welcome notification
        welcomeNotification: {
          disable: this.config.welcomeNotification?.disable ?? true,
          title: this.config.welcomeNotification?.title,
          message: this.config.welcomeNotification?.message,
          url: this.config.welcomeNotification?.url,
        },

        // Click handlers
        notificationClickHandlerMatch: this.config.notificationClickHandlerMatch ?? 'origin',
        notificationClickHandlerAction: this.config.notificationClickHandlerAction ?? 'focus',
      });

      this.isInitialized = true;
      console.log('OneSignal initialized successfully');

      // Set up event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('Failed to initialize OneSignal:', error);
      throw error;
    }
  }

  /**
   * Set up OneSignal event listeners
   */
  private setupEventListeners(): void {
    // Listen for subscription changes
    OneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
      console.log('OneSignal subscription changed:', isSubscribed);
      
      // Store subscription status in localStorage for UI updates
      localStorage.setItem('onesignal_subscribed', String(isSubscribed));
      
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('onesignal-subscription-changed', {
        detail: { isSubscribed }
      }));
    });

    // Listen for notification permission changes
    OneSignal.on('permissionChange', (permission: string) => {
      console.log('OneSignal permission changed:', permission);
      
      // Store permission status
      localStorage.setItem('onesignal_permission', permission);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('onesignal-permission-changed', {
        detail: { permission }
      }));
    });

    // Listen for notification clicks
    OneSignal.on('notificationClick', (event: any) => {
      console.log('OneSignal notification clicked:', event);
      
      // Handle custom data from notification
      const data = event.data;
      if (data && data.action_url) {
        // Navigate to the action URL
        window.location.href = data.action_url;
      }
    });

    // Listen for notification display
    OneSignal.on('notificationDisplay', (event: any) => {
      console.log('OneSignal notification displayed:', event);
    });
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await OneSignal.requestPermission();
      return permission;
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }

  /**
   * Show a custom subscription prompt
   */
  async showPrompt(): Promise<void> {
    try {
      await OneSignal.showSlidedownPrompt();
    } catch (error) {
      console.error('Failed to show prompt:', error);
    }
  }

  /**
   * Get current subscription status
   */
  async isSubscribed(): Promise<boolean> {
    try {
      return await OneSignal.isPushNotificationsEnabled();
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  /**
   * Get current permission status
   */
  async getPermission(): Promise<string> {
    try {
      return await OneSignal.getNotificationPermission();
    } catch (error) {
      console.error('Failed to get permission:', error);
      return 'default';
    }
  }

  /**
   * Set external user ID (link OneSignal subscription to your user)
   */
  async setExternalUserId(userId: string): Promise<void> {
    try {
      await OneSignal.setExternalUserId(userId);
      console.log('OneSignal external user ID set:', userId);
    } catch (error) {
      console.error('Failed to set external user ID:', error);
    }
  }

  /**
   * Remove external user ID
   */
  async removeExternalUserId(): Promise<void> {
    try {
      await OneSignal.removeExternalUserId();
      console.log('OneSignal external user ID removed');
    } catch (error) {
      console.error('Failed to remove external user ID:', error);
    }
  }

  /**
   * Add tags to the user
   */
  async setTags(tags: Record<string, string>): Promise<void> {
    try {
      await OneSignal.sendTags(tags);
      console.log('OneSignal tags set:', tags);
    } catch (error) {
      console.error('Failed to set tags:', error);
    }
  }

  /**
   * Remove tags from the user
   */
  async removeTags(tagKeys: string[]): Promise<void> {
    try {
      await OneSignal.deleteTags(tagKeys);
      console.log('OneSignal tags removed:', tagKeys);
    } catch (error) {
      console.error('Failed to remove tags:', error);
    }
  }

  /**
   * Get user data including subscription ID
   */
  async getUserData(): Promise<{
    subscriptionId?: string;
    userId?: string;
    optedIn?: boolean;
    subscriptionToken?: string;
  }> {
    try {
      const subscriptionId = await OneSignal.getRegistrationId();
      const userId = await OneSignal.getExternalUserId();
      const optedIn = await OneSignal.isPushNotificationsEnabled();
      
      return {
        subscriptionId: subscriptionId || undefined,
        userId: userId || undefined,
        optedIn,
      };
    } catch (error) {
      console.error('Failed to get user data:', error);
      return {};
    }
  }

  /**
   * Unsubscribe from notifications
   */
  async unsubscribe(): Promise<void> {
    try {
      await OneSignal.setSubscription(false);
      console.log('OneSignal unsubscribed');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  /**
   * Resubscribe to notifications
   */
  async subscribe(): Promise<void> {
    try {
      await OneSignal.setSubscription(true);
      console.log('OneSignal subscribed');
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  }

  /**
   * Check if OneSignal is supported in the current browser
   */
  static isSupported(): boolean {
    return OneSignal.isPushNotificationsSupported();
  }

  /**
   * Set notification categories (for user preference management)
   */
  async setNotificationCategories(categories: {
    booking_notifications?: boolean;
    message_notifications?: boolean;
    payment_notifications?: boolean;
    review_notifications?: boolean;
    system_notifications?: boolean;
    marketing_notifications?: boolean;
  }): Promise<void> {
    const tags: Record<string, string> = {};
    
    Object.entries(categories).forEach(([key, value]) => {
      tags[key] = String(value);
    });
    
    await this.setTags(tags);
  }
}

// Default configuration
export const defaultOneSignalConfig: OneSignalConfig = {
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
  allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
  requiresUserPrivacyConsent: false,
  promptOptions: {
    slidedown: {
      enabled: false, // We'll handle prompts manually
      autoPrompt: false,
    },
    customlink: {
      enabled: true,
      style: 'button',
      size: 'medium',
      color: {
        button: '#44D62C', // Rent It Forward brand green
        text: '#ffffff',
      },
      text: {
        subscribe: 'Enable notifications',
        unsubscribe: 'Disable notifications',
        explanation: 'Get notified about your bookings, messages, and important updates',
      },
    },
  },
  welcomeNotification: {
    disable: true, // We'll send our own welcome notification via API
  },
  notificationClickHandlerMatch: 'origin',
  notificationClickHandlerAction: 'focus',
};

// Create singleton instance
export const oneSignalService = new OneSignalService(defaultOneSignalConfig); 