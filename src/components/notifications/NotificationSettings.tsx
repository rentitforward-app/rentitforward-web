'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/Badge';
import { Bell, BellOff, CheckCircle, AlertCircle, Mail, CreditCard, Star, Megaphone, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFCM, useNotificationPermission, useNotificationPreferences } from '@/components/FCMProvider';

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
  push_notifications: boolean;
  email_enabled: boolean;
  fcm_web_enabled: boolean;
  fcm_mobile_enabled: boolean;
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
  const fcm = useFCM();
  const { permission, requestPermission } = useNotificationPermission();
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const [saving, setSaving] = useState(false);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
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
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Error enabling notifications',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleDisablePushNotifications = async () => {
    try {
      // Update preferences to disable push notifications
      await updatePreferences({
        ...preferences,
        push_notifications: false,
        fcm_web_enabled: false,
      });
      
      toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications.',
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: 'Error disabling notifications',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const updatedPreferences = { ...preferences, [key]: value };
    updatePreferences(updatedPreferences);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await updatePreferences(preferences);
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
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
                Status: {permission === 'granted' ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                ) : permission === 'denied' ? (
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
            
            {permission === 'granted' ? (
              <Button
                variant="outline"
                onClick={handleDisablePushNotifications}
                className="text-red-600 hover:text-red-700"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Disable
              </Button>
            ) : (
              <Button onClick={handleRequestPermission}>
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

      {/* Platform-Specific Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>
            Control notifications for different platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Web Notifications</p>
              <p className="text-sm text-gray-600">Receive notifications in your browser</p>
            </div>
            <Switch
              checked={preferences.fcm_web_enabled}
              onCheckedChange={(checked) => updatePreference('fcm_web_enabled', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Mobile App Notifications</p>
              <p className="text-sm text-gray-600">Receive notifications on your mobile device</p>
            </div>
            <Switch
              checked={preferences.fcm_mobile_enabled}
              onCheckedChange={(checked) => updatePreference('fcm_mobile_enabled', checked)}
            />
          </div>
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