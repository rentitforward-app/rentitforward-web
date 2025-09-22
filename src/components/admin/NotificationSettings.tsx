'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Bell, 
  BellOff, 
  Mail, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  TestTube
} from 'lucide-react';
import { fcmClient } from '@/lib/notifications/fcm-client';
import { toast } from 'react-hot-toast';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [fcmPermission, setFcmPermission] = useState<NotificationPermission | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingFCM, setIsTestingFCM] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = () => {
    const permission = fcmClient.getPermissionStatus();
    setFcmPermission(permission);
    
    // Check if FCM is supported
    if (!fcmClient.isNotificationSupported()) {
      console.warn('FCM not supported in this browser');
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      // Request permission
      const permissionResult = await fcmClient.requestPermission();
      
      if (!permissionResult.success) {
        toast.error(permissionResult.error || 'Failed to get notification permission');
        setFcmPermission(permissionResult.permission || 'denied');
        return;
      }

      // Register token
      const registerResult = await fcmClient.registerToken();
      
      if (!registerResult.success) {
        toast.error(registerResult.error || 'Failed to register for notifications');
        return;
      }

      setFcmPermission('granted');
      setIsRegistered(true);
      toast.success('Push notifications enabled successfully!');
      
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await fcmClient.unregisterToken();
      
      if (!result.success) {
        toast.error(result.error || 'Failed to disable notifications');
        return;
      }

      setIsRegistered(false);
      toast.success('Push notifications disabled');
      
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const response = await fetch('/api/admin/test-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'email' }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error(result.results?.email?.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleTestFCM = async () => {
    setIsTestingFCM(true);
    try {
      const response = await fetch('/api/admin/test-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'fcm' }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Test push notification sent successfully!');
      } else {
        toast.error(result.results?.fcm?.error || 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test FCM:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsTestingFCM(false);
    }
  };

  const getPermissionIcon = () => {
    switch (fcmPermission) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'default':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <BellOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPermissionText = () => {
    switch (fcmPermission) {
      case 'granted':
        return 'Notifications enabled';
      case 'denied':
        return 'Notifications blocked';
      case 'default':
        return 'Notifications not configured';
      default:
        return 'Notifications not supported';
    }
  };

  const getPermissionColor = () => {
    switch (fcmPermission) {
      case 'granted':
        return 'text-green-600';
      case 'denied':
        return 'text-red-600';
      case 'default':
        return 'text-yellow-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <Settings className="w-6 h-6 text-gray-700 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Mail className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-600">
                Receive email alerts for all issue reports
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">Always On</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestEmail}
              disabled={isTestingEmail}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isTestingEmail ? 'Testing...' : 'Test'}
            </Button>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Smartphone className="w-5 h-5 text-gray-600 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">Push Notifications</h4>
              <p className="text-sm text-gray-600">
                Real-time alerts for urgent issues (high/critical severity)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getPermissionIcon()}
              <span className={`text-sm font-medium ${getPermissionColor()}`}>
                {getPermissionText()}
              </span>
            </div>
            
            {fcmPermission === 'granted' ? (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestFCM}
                  disabled={isTestingFCM}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {isTestingFCM ? 'Testing...' : 'Test'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisableNotifications}
                  disabled={isLoading}
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  Disable
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                disabled={isLoading || fcmPermission === 'denied'}
              >
                <Bell className="w-4 h-4 mr-2" />
                {isLoading ? 'Enabling...' : 'Enable'}
              </Button>
            )}
          </div>
        </div>

        {/* Browser Compatibility Notice */}
        {!fcmClient.isNotificationSupported() && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Browser Not Supported</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari for the best experience.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permission Denied Notice */}
        {fcmPermission === 'denied' && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start">
              <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Notifications Blocked</h4>
                <p className="text-sm text-red-700 mt-1">
                  You have blocked notifications for this site. To enable them, click the notification icon in your browser's address bar and allow notifications, then refresh this page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <Bell className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">How Notifications Work</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• <strong>Email:</strong> All issue reports trigger email notifications</li>
                <li>• <strong>Push:</strong> Only high and critical severity issues trigger real-time push notifications</li>
                <li>• <strong>Instant Alerts:</strong> Critical issues require immediate attention</li>
                <li>• <strong>Background:</strong> Push notifications work even when the admin panel is closed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}


