'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useOneSignal } from '@/lib/onesignal/client';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Smartphone, 
  Monitor,
  Settings,
  Shield,
  AlertTriangle,
  Info
} from 'lucide-react';

interface NotificationPreferences {
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  rentalReminders: boolean;
  marketingNotifications: boolean;
  emailBackup: boolean;
}

interface NotificationStatus {
  hasWebNotifications: boolean;
  hasMobileNotifications: boolean;
  webPermission: string;
  isSupported: boolean;
}

export function NotificationPreferences() {
  const oneSignal = useOneSignal();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    bookingUpdates: true,
    paymentUpdates: true,
    rentalReminders: true,
    marketingNotifications: false,
    emailBackup: true,
  });
  
  const [status, setStatus] = useState<NotificationStatus>({
    hasWebNotifications: false,
    hasMobileNotifications: false,
    webPermission: 'default',
    isSupported: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotificationStatus();
  }, []);

  const loadNotificationStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check OneSignal status
      await oneSignal.initialize();
      
      const [permission, isEnabled, playerId] = await Promise.all([
        oneSignal.getPermissionStatus(),
        oneSignal.isPushEnabled(),
        oneSignal.getPlayerId(),
      ]);

      setStatus({
        hasWebNotifications: isEnabled && !!playerId,
        hasMobileNotifications: false, // Will be updated from API
        webPermission: permission,
        isSupported: typeof window !== 'undefined' && 'Notification' in window,
      });

      // Load user preferences from API
      await loadUserPreferences();
      
    } catch (error) {
      console.error('Failed to load notification status:', error);
      setError('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/notification-preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setStatus(prev => ({
          ...prev,
          hasMobileNotifications: data.hasMobileNotifications,
        }));
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const handleEnableWebNotifications = async () => {
    try {
      setIsUpdating(true);
      setError(null);

      const granted = await oneSignal.requestPermission();
      
      if (granted) {
        // Get player ID and register it
        const playerId = await oneSignal.getPlayerId();
        
        if (playerId) {
          await fetch('/api/notifications/player-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              platform: 'web',
              timestamp: new Date().toISOString(),
            }),
          });
        }

        setStatus(prev => ({
          ...prev,
          hasWebNotifications: true,
          webPermission: 'granted',
        }));
      } else {
        setError('Notification permission was denied');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      setError('Failed to enable notifications');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisableWebNotifications = async () => {
    try {
      setIsUpdating(true);
      setError(null);

      // Remove player ID from database
      await fetch('/api/notifications/player-id', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'web' }),
      });

      setStatus(prev => ({
        ...prev,
        hasWebNotifications: false,
      }));
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      setError('Failed to disable notifications');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      await fetch('/api/user/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPreferences }),
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setError('Failed to save preferences');
      // Revert change on error
      setPreferences(preferences);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notification settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notification Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!status.isSupported && (
            <Alert className="border-orange-200 bg-orange-50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Push notifications are not supported in this browser.
              </AlertDescription>
            </Alert>
          )}

          {/* Web Notifications */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium">Web Browser Notifications</div>
                <div className="text-sm text-gray-600">
                  Get notified while browsing our website
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {status.hasWebNotifications ? (
                <>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <Check className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                  <Button
                    onClick={handleDisableWebNotifications}
                    disabled={isUpdating}
                    variant="outline"
                    size="sm"
                  >
                    Disable
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="text-gray-600 border-gray-200">
                    <X className="w-3 h-3 mr-1" />
                    Disabled
                  </Badge>
                  <Button
                    onClick={handleEnableWebNotifications}
                    disabled={isUpdating || !status.isSupported}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? 'Enabling...' : 'Enable'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Notifications */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium">Mobile App Notifications</div>
                <div className="text-sm text-gray-600">
                  Get notified through our mobile app
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {status.hasMobileNotifications ? (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <Check className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-200">
                  <X className="w-3 h-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Updates */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="booking-updates" className="font-medium">
                Booking Updates
              </Label>
              <div className="text-sm text-gray-600">
                Get notified about booking requests, approvals, and status changes
              </div>
            </div>
            <Switch
              id="booking-updates"
              checked={preferences.bookingUpdates}
              onCheckedChange={(checked) => handlePreferenceChange('bookingUpdates', checked)}
            />
          </div>

          {/* Payment Updates */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="payment-updates" className="font-medium">
                Payment Updates
              </Label>
              <div className="text-sm text-gray-600">
                Get notified about payment confirmations and refunds
              </div>
            </div>
            <Switch
              id="payment-updates"
              checked={preferences.paymentUpdates}
              onCheckedChange={(checked) => handlePreferenceChange('paymentUpdates', checked)}
            />
          </div>

          {/* Rental Reminders */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rental-reminders" className="font-medium">
                Rental Reminders
              </Label>
              <div className="text-sm text-gray-600">
                Get reminders for pickup, return, and rental deadlines
              </div>
            </div>
            <Switch
              id="rental-reminders"
              checked={preferences.rentalReminders}
              onCheckedChange={(checked) => handlePreferenceChange('rentalReminders', checked)}
            />
          </div>

          {/* Marketing Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketing-notifications" className="font-medium">
                Marketing & Promotions
              </Label>
              <div className="text-sm text-gray-600">
                Get notified about special offers and new features
              </div>
            </div>
            <Switch
              id="marketing-notifications"
              checked={preferences.marketingNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('marketingNotifications', checked)}
            />
          </div>

          {/* Email Backup */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-backup" className="font-medium">
                Email Backup
              </Label>
              <div className="text-sm text-gray-600">
                Also send important notifications via email
              </div>
            </div>
            <Switch
              id="email-backup"
              checked={preferences.emailBackup}
              onCheckedChange={(checked) => handlePreferenceChange('emailBackup', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy:</strong> We only send notifications about your bookings and account activity. 
          You can disable notifications at any time. We never share your notification preferences with third parties.
        </AlertDescription>
      </Alert>
    </div>
  );
}