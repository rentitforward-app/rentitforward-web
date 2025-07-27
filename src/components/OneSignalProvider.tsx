'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface OneSignalProviderProps {
  children: React.ReactNode;
}

// Global OneSignal interface for v16 SDK
declare global {
  interface Window {
    OneSignal?: {
      login: (externalId: string) => Promise<void>;
      logout: () => Promise<void>;
      User: {
        onesignalId: string | null;
        externalId: string | null;
        addTag: (key: string, value: string) => Promise<void>;
        addTags: (tags: Record<string, string>) => Promise<void>;
        removeTag: (key: string) => Promise<void>;
        removeTags: (keys: string[]) => Promise<void>;
        addEventListener: (event: string, callback: (data: any) => void) => void;
        PushSubscription: {
          addEventListener: (event: string, callback: (data: any) => void) => void;
          optIn: () => Promise<void>;
          optOut: () => Promise<void>;
          optedIn: boolean;
          id: string | null;
          token: string | null;
        };
      };
      Notifications: {
        requestPermission: () => Promise<boolean>;
        addEventListener: (event: string, callback: (data: any) => void) => void;
        permission: boolean;
      };
      Slidedown: {
        promptPush: () => Promise<void>;
        promptPushCategories: () => Promise<void>;
        addEventListener: (event: string, callback: (data: any) => void) => void;
      };
    };
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { user } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once when the component mounts
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Check if OneSignal app ID is configured
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn('OneSignal App ID not configured');
      return;
    }

    // Set up OneSignal deferred initialization
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      console.log('OneSignal SDK loaded, setting up event listeners...');
      
      // Set up event listeners
      setupOneSignalListeners(OneSignal);
      
      console.log('OneSignal initialization completed');
    });
  }, []);

  // Set up OneSignal event listeners
  const setupOneSignalListeners = (OneSignal: any) => {
    try {
      console.log('Setting up OneSignal event listeners...');
      
      // Set up user state change listener
      OneSignal.User.addEventListener('change', (event: any) => {
        console.log('OneSignal user state changed:', event);
      });

      // Set up push subscription change listener
      OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
        console.log('OneSignal push subscription changed:', event);
        
        // Handle subscription changes
        if (event.current?.optedIn) {
          console.log('User is now subscribed to push notifications');
          console.log('Push subscription ID:', event.current.id);
          console.log('Push token:', event.current.token);
          
          // Store subscription status
          localStorage.setItem('onesignal_subscribed', 'true');
          localStorage.setItem('onesignal_subscription_id', event.current.id || '');
          
          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('onesignal-subscription-changed', {
            detail: { 
              isSubscribed: true, 
              subscriptionId: event.current.id,
              token: event.current.token 
            }
          }));
        } else {
          console.log('User is not subscribed to push notifications');
          
          // Update storage
          localStorage.setItem('onesignal_subscribed', 'false');
          localStorage.removeItem('onesignal_subscription_id');
          
          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('onesignal-subscription-changed', {
            detail: { isSubscribed: false }
          }));
        }
      });

      // Set up notification permission change listener
      OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
        console.log('OneSignal permission changed:', permission);
        
        // Store permission status
        localStorage.setItem('onesignal_permission', permission.toString());
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('onesignal-permission-changed', {
          detail: { permission }
        }));
      });

      // Set up notification click listener
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('OneSignal notification clicked:', event);
        
        // Handle custom data from notification
        const data = event.notification?.additionalData;
        if (data?.action_url) {
          // Navigate to the action URL
          window.location.href = data.action_url;
        }
      });

      // Set up notification display listener (foreground)
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        console.log('OneSignal notification will display in foreground:', event);
        
        // You can prevent the notification from showing with:
        // event.preventDefault();
      });

      // Set up slidedown event listeners
      OneSignal.Slidedown.addEventListener('slidedownShown', (event: any) => {
        console.log('OneSignal slidedown shown:', event);
      });

      console.log('OneSignal event listeners set up successfully');
    } catch (error) {
      console.error('Error setting up OneSignal listeners:', error);
    }
  };

  // Handle user authentication changes
  useEffect(() => {
    const handleUserChange = async () => {
      try {
        if (user?.id) {
          // User logged in - set external user ID
          console.log('Setting OneSignal external user ID:', user.id);
          
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async function(OneSignal: any) {
            await OneSignal.login(user.id);
            console.log('OneSignal external user ID set:', user.id);
            
            // Set user tags
            await OneSignal.User.addTags({
              user_type: user.user_metadata?.user_type || 'regular',
              platform: 'web',
              email: user.email || '',
              account_created: new Date(user.created_at).toISOString().split('T')[0],
            });
          });
        } else {
          // User logged out - remove external user ID
          console.log('Removing OneSignal external user ID');
          
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async function(OneSignal: any) {
            await OneSignal.logout();
            console.log('OneSignal external user ID removed');
          });
        }
      } catch (error) {
        console.error('Error handling OneSignal user change:', error);
      }
    };

    // Add a small delay to ensure OneSignal is initialized
    const timer = setTimeout(handleUserChange, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  return <>{children}</>;
}

// Hook for accessing OneSignal functionality
export function useOneSignal() {
  const requestPermission = async (): Promise<boolean> => {
    try {
      if (!window.OneSignal) {
        console.warn('OneSignal not initialized yet');
        return false;
      }
      
      const granted = await window.OneSignal.Notifications.requestPermission();
      return granted;
    } catch (error) {
      console.error('Error requesting OneSignal permission:', error);
      return false;
    }
  };

  const promptForPermission = async (): Promise<void> => {
    try {
      if (!window.OneSignal) {
        throw new Error('OneSignal not initialized');
      }
      
      await window.OneSignal.Slidedown.promptPush();
    } catch (error) {
      console.error('Error showing OneSignal prompt:', error);
      throw error;
    }
  };

  const isSubscribed = (): boolean => {
    try {
      if (!window.OneSignal) return false;
      return window.OneSignal.User.PushSubscription.optedIn;
    } catch (error) {
      console.error('Error checking OneSignal subscription:', error);
      return false;
    }
  };

  const subscribe = async (): Promise<void> => {
    try {
      if (!window.OneSignal) {
        throw new Error('OneSignal not initialized');
      }
      await window.OneSignal.User.PushSubscription.optIn();
    } catch (error) {
      console.error('Error subscribing to OneSignal:', error);
      throw error;
    }
  };

  const unsubscribe = async (): Promise<void> => {
    try {
      if (!window.OneSignal) {
        throw new Error('OneSignal not initialized');
      }
      await window.OneSignal.User.PushSubscription.optOut();
    } catch (error) {
      console.error('Error unsubscribing from OneSignal:', error);
      throw error;
    }
  };

  const setNotificationPreferences = async (preferences: {
    booking_notifications?: boolean;
    message_notifications?: boolean;
    payment_notifications?: boolean;
    review_notifications?: boolean;
    system_notifications?: boolean;
    marketing_notifications?: boolean;
  }): Promise<void> => {
    try {
      if (!window.OneSignal) {
        throw new Error('OneSignal not initialized');
      }
      
      // Convert boolean preferences to string tags
      const tags: Record<string, string> = {};
      Object.entries(preferences).forEach(([key, value]) => {
        if (value !== undefined) {
          tags[key] = value.toString();
        }
      });
      
      await window.OneSignal.User.addTags(tags);
      console.log('✅ OneSignal preferences updated:', preferences);
    } catch (error) {
      console.error('Error updating OneSignal preferences:', error);
      throw error;
    }
  };

  const getSubscriptionId = (): string | null => {
    try {
      if (!window.OneSignal) return null;
      return window.OneSignal.User.PushSubscription.id;
    } catch (error) {
      console.error('Error getting OneSignal subscription ID:', error);
      return null;
    }
  };

  const getOneSignalId = (): string | null => {
    try {
      if (!window.OneSignal) return null;
      return window.OneSignal.User.onesignalId;
    } catch (error) {
      console.error('Error getting OneSignal user ID:', error);
      return null;
    }
  };

  return {
    requestPermission,
    promptForPermission,
    isSubscribed,
    subscribe,
    unsubscribe,
    setNotificationPreferences,
    getSubscriptionId,
    getOneSignalId,
  };
} 