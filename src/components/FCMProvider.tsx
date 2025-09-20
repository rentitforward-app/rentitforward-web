/**
 * FCM Provider Component
 * 
 * Provides FCM functionality throughout the web application
 * Handles token registration, permission management, and message handling
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fcmClientService, type MessagePayload } from '@/lib/fcm/client';
import { useAuth } from '@/hooks/useAuth';

interface FCMContextType {
  // Token management
  token: string | null;
  isSupported: boolean;
  permission: NotificationPermission;
  isRegistered: boolean;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  registerToken: () => Promise<boolean>;
  unregisterToken: () => Promise<boolean>;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Message handling
  lastMessage: MessagePayload | null;
  unreadCount: number;
  
  // Preferences
  preferences: NotificationPreferences | null;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
}

interface NotificationPreferences {
  booking_notifications: boolean;
  message_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  system_notifications: boolean;
  marketing_notifications: boolean;
  push_notifications: boolean;
  email_enabled: boolean;
  fcm_web_enabled: boolean;
  fcm_mobile_enabled: boolean;
}

const FCMContext = createContext<FCMContextType | null>(null);

interface FCMProviderProps {
  children: React.ReactNode;
}

export function FCMProvider({ children }: FCMProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MessagePayload | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Initialize FCM support check
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await fcmClientService.isNotificationSupported();
      setIsSupported(supported);
      setPermission(fcmClientService.getPermissionStatus());
    };

    checkSupport();
  }, []);

  // Load user preferences when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadPreferences();
      loadUnreadCount();
    } else {
      setPreferences(null);
      setUnreadCount(0);
      setIsRegistered(false);
      setToken(null);
    }
  }, [isAuthenticated, user]);

  // Set up message listener
  useEffect(() => {
    const handleFCMMessage = (event: CustomEvent) => {
      const { payload } = event.detail;
      setLastMessage(payload);
      
      // Update unread count
      loadUnreadCount();
    };

    window.addEventListener('fcm-message', handleFCMMessage as EventListener);
    
    return () => {
      window.removeEventListener('fcm-message', handleFCMMessage as EventListener);
    };
  }, []);

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        
        // Check if FCM token is registered
        if (data.preferences?.fcm_web_enabled) {
          const currentToken = await fcmClientService.getCurrentToken();
          if (currentToken) {
            setToken(currentToken);
            setIsRegistered(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }, []);

  // Load unread notification count
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [isAuthenticated, user]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fcmClientService.requestPermissionAndGetToken();
      
      if (result.success && result.token) {
        setToken(result.token);
        setPermission('granted');
        return true;
      } else {
        setError(result.error || 'Failed to get permission');
        setPermission('denied');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Register FCM token with backend
  const registerToken = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      setError('User must be authenticated to register for notifications');
      return false;
    }

    if (!token) {
      const permissionGranted = await requestPermission();
      if (!permissionGranted) return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fcmClientService.registerToken(user.id);
      
      if (result.success) {
        setIsRegistered(true);
        
        // Update preferences to enable web FCM
        await updatePreferences({ 
          fcm_web_enabled: true, 
          push_notifications: true 
        });
        
        return true;
      } else {
        setError(result.error || 'Failed to register token');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, token, requestPermission]);

  // Unregister FCM token
  const unregisterToken = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fcmClientService.unregisterToken();
      
      if (result.success) {
        setIsRegistered(false);
        setToken(null);
        
        // Update preferences to disable web FCM
        await updatePreferences({ 
          fcm_web_enabled: false 
        });
        
        return true;
      } else {
        setError(result.error || 'Failed to unregister token');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update notification preferences
  const updatePreferences = useCallback(async (
    newPrefs: Partial<NotificationPreferences>
  ): Promise<boolean> => {
    if (!preferences) return false;

    const updatedPrefs = { ...preferences, ...newPrefs };

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: updatedPrefs,
        }),
      });

      if (response.ok) {
        setPreferences(updatedPrefs);
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update preferences');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return false;
    }
  }, [preferences]);

  const contextValue: FCMContextType = {
    // Token management
    token,
    isSupported,
    permission,
    isRegistered,
    
    // Actions
    requestPermission,
    registerToken,
    unregisterToken,
    
    // State
    isLoading,
    error,
    
    // Message handling
    lastMessage,
    unreadCount,
    
    // Preferences
    preferences,
    updatePreferences,
  };

  return (
    <FCMContext.Provider value={contextValue}>
      {children}
    </FCMContext.Provider>
  );
}

// Hook to use FCM context
export function useFCM() {
  const context = useContext(FCMContext);
  if (!context) {
    throw new Error('useFCM must be used within an FCMProvider');
  }
  return context;
}

// Hook for notification permission status
export function useNotificationPermission() {
  const { permission, isSupported, requestPermission } = useFCM();
  
  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    requestPermission,
  };
}

// Hook for notification preferences
export function useNotificationPreferences() {
  const { preferences, updatePreferences, isLoading, error } = useFCM();
  
  return {
    preferences,
    updatePreferences,
    isLoading,
    error,
  };
}

// Hook for unread notifications
export function useUnreadNotifications() {
  const { unreadCount, lastMessage } = useFCM();
  
  return {
    unreadCount,
    lastMessage,
    hasUnread: unreadCount > 0,
  };
}
