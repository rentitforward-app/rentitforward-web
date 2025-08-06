'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, CheckCircle, AlertCircle, Mail, CreditCard, Star, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface NotificationCategory {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  defaultValue: boolean;
  disabled?: boolean;
}

interface NotificationPreferences {
  booking_notifications: boolean;
  message_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  system_notifications: boolean;
  marketing_notifications: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

const notificationCategories: NotificationCategory[] = [
  {
    key: 'booking_notifications',
    title: 'Booking Updates',
    description: 'Get notified about booking requests, confirmations, and changes',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    defaultValue: true,
  },
  {
    key: 'message_notifications',
    title: 'Messages',
    description: 'Receive notifications for new messages from other users',
    icon: <Mail className="w-5 h-5 text-blue-600" />,
    defaultValue: true,
  },
  {
    key: 'payment_notifications',
    title: 'Payment Updates',
    description: 'Stay informed about payments, refunds, and billing issues',
    icon: <CreditCard className="w-5 h-5 text-purple-600" />,
    defaultValue: true,
  },
  {
    key: 'review_notifications',
    title: 'Reviews & Ratings',
    description: 'Get notified about new reviews and review requests',
    icon: <Star className="w-5 h-5 text-yellow-600" />,
    defaultValue: true,
  },
  {
    key: 'system_notifications',
    title: 'System Updates',
    description: 'Important announcements and platform updates',
    icon: <Megaphone className="w-5 h-5 text-orange-600" />,
    defaultValue: true,
    disabled: true, // System notifications should be mandatory
  },
  {
    key: 'marketing_notifications',
    title: 'Marketing & Promotions',
    description: 'Tips, features, and special offers (optional)',
    icon: <AlertCircle className="w-5 h-5 text-pink-600" />,
    defaultValue: false,
  },
];

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    booking_notifications: true,
    message_notifications: true,
    payment_notifications: true,
    review_notifications: true,
    system_notifications: true,
    marketing_notifications: false,
    push_enabled: false,
    email_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');

  // Load user preferences on mount
  useEffect(() => {
    loadPreferences();
    checkPushPermission();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(prev => ({ ...prev, ...data.preferences }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPushPermission = async () => {
    if ('Notification' in window) {
      setPushPermissionStatus(Notification.permission);
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushPermissionStatus(permission);
      
      if (permission === 'granted') {
        // Initialize OneSignal if not already done
        if (window.OneSignal) {
          await window.OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
            allowLocalhostAsSecureOrigin: true,
          });
          
          // Set external user ID
          if (user?.id) {
            await window.OneSignal.setExternalUserId(user.id);
          }
        }
        
        setPreferences(prev => ({ ...prev, push_enabled: true }));
        toast({
          title: 'Push notifications enabled',
          description: 'You will now receive push notifications.',
        });
      } else {
        toast({
          title: 'Push notifications blocked',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    }
  };

  const disablePushNotifications = async () => {
    if (window.OneSignal) {
      await window.OneSignal.setSubscription(false);
    }
    setPreferences(prev => ({ ...prev, push_enabled: false }));
    setPushPermissionStatus('denied');
    
    toast({
      title: 'Push notifications disabled',
      description: 'You will no longer receive push notifications.',
    });
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const savePreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        // Update OneSignal tags based on preferences
        if (window.OneSignal && preferences.push_enabled) {
          await window.OneSignal.sendTags({
            booking_notifications: preferences.booking_notifications,
            message_notifications: preferences.message_notifications,
            payment_notifications: preferences.payment_notifications,
            review_notifications: preferences.review_notifications,
            marketing_notifications: preferences.marketing_notifications,
          });
        }

        toast({
          title: 'Preferences saved',
          description: 'Your notification preferences have been updated.',
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error saving preferences',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive instant notifications even when you're not browsing the site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Browser Push Notifications</p>
              <p className="text-sm text-gray-600">
                Status: {pushPermissionStatus === 'granted' ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                ) : pushPermissionStatus === 'denied' ? (
                  <Badge variant="destructive">
                    <BellOff className="w-3 h-3 mr-1" />
                    Blocked
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Not Set
                  </Badge>
                )}
              </p>
            </div>
            
            {pushPermissionStatus === 'granted' ? (
              <Button
                variant="outline"
                onClick={disablePushNotifications}
                className="text-red-600 hover:text-red-700"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Disable
              </Button>
            ) : (
              <Button onClick={requestPushPermission}>
                <Bell className="w-4 h-4 mr-2" />
                Enable Push
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationCategories.map((category, index) => (
            <div key={category.key}>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-start gap-3 flex-1">
                  {category.icon}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{category.title}</p>
                      {category.disabled && (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
                
                <Switch
                  checked={preferences[category.key as keyof NotificationPreferences] as boolean}
                  onCheckedChange={(checked) => updatePreference(category.key as keyof NotificationPreferences, checked)}
                  disabled={category.disabled}
                />
              </div>
              {index < notificationCategories.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Methods</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <Switch
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

// Global OneSignal type declaration
declare global {
  interface Window {
    OneSignal?: {
      init: (config: any) => Promise<void>;
      setExternalUserId: (userId: string) => Promise<void>;
      setSubscription: (subscribe: boolean) => Promise<void>;
      sendTags: (tags: Record<string, any>) => Promise<void>;
    };
  }
} 