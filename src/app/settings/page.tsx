'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Bell, 
  Shield, 
  User, 
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  Download,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { VerificationDashboard } from '@/components/VerificationDashboard';

interface NotificationSettings {
  email_bookings: boolean;
  email_messages: boolean;
  email_marketing: boolean;
  sms_bookings: boolean;
  sms_reminders: boolean;
  push_notifications: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_alerts: boolean;
  session_timeout: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  verified: boolean;
  stripe_onboarded: boolean;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('verification');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_bookings: true,
    email_messages: true,
    email_marketing: false,
    sms_bookings: true,
    sms_reminders: true,
    push_notifications: true
  });
  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_alerts: true,
    session_timeout: 30
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
    
    // Check for Stripe return parameters and switch to verification section
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_return') === 'true' || urlParams.get('stripe_refresh') === 'true') {
      setActiveSection('verification');
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, verified, stripe_onboarded')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUpdate = async (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    // Would save to database in real app
    toast.success('Notification preferences updated');
  };

  const handleSecurityUpdate = async (key: keyof SecuritySettings, value: boolean | number) => {
    setSecurity(prev => ({ ...prev, [key]: value }));
    // Would save to database in real app
    toast.success('Security settings updated');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    toast.success('Logged out successfully');
  };

  const handleDeleteAccount = async () => {
    // Would handle account deletion in real app
    toast.error('Account deletion not implemented yet');
    setShowDeleteConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-2">
                {[
                  { key: 'verification', label: 'Payments & Verification', icon: CreditCard },
                  { key: 'notifications', label: 'Notifications', icon: Bell },
                  { key: 'security', label: 'Privacy & Security', icon: Shield },
                  { key: 'data', label: 'Data & Privacy', icon: FileText },
                  { key: 'danger', label: 'Account Management', icon: Settings }
                ].map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSection === section.key
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 mr-3" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Payments & Verification */}
            {activeSection === 'verification' && (
              <div className="space-y-6">
                <VerificationDashboard />
              </div>
            )}

            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center mb-6">
                    <Bell className="w-6 h-6 text-yellow-500 mr-3" />
                    <h2 className="text-xl font-semibold">Notification Preferences</h2>
                  </div>
                  <p className="text-gray-600 mb-6">Choose how you want to receive notifications</p>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Email Notifications</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'email_bookings', label: 'Booking updates and confirmations', description: 'Get notified about new bookings and status changes' },
                          { key: 'email_messages', label: 'New messages', description: 'Receive emails when you get new messages' },
                          { key: 'email_marketing', label: 'Marketing and promotions', description: 'Tips, news, and special offers from Rent It Forward' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.label}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            <button
                              onClick={() => handleNotificationUpdate(item.key as keyof NotificationSettings, !notifications[item.key as keyof NotificationSettings])}
                              className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                                notifications[item.key as keyof NotificationSettings] ? 'bg-green-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  notifications[item.key as keyof NotificationSettings] ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">SMS Notifications</h3>
                      <div className="space-y-4">
                        {[
                          { key: 'sms_bookings', label: 'Urgent booking alerts', description: 'Time-sensitive booking notifications' },
                          { key: 'sms_reminders', label: 'Rental reminders', description: 'Reminders about upcoming pickups and returns' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.label}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            <button
                              onClick={() => handleNotificationUpdate(item.key as keyof NotificationSettings, !notifications[item.key as keyof NotificationSettings])}
                              className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                                notifications[item.key as keyof NotificationSettings] ? 'bg-green-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  notifications[item.key as keyof NotificationSettings] ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center mb-6">
                    <Shield className="w-6 h-6 text-green-500 mr-3" />
                    <h2 className="text-xl font-semibold">Privacy & Security</h2>
                  </div>
                  <p className="text-gray-600 mb-6">Manage your privacy settings and security preferences</p>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Enable 2FA</p>
                          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                        <Button variant="outline">
                          {security.two_factor_enabled ? 'Disable' : 'Enable'} 2FA
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Password</h3>
                      <Button variant="outline">
                        Change Password
                      </Button>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Login Alerts</h3>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Email alerts for new logins</p>
                          <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                        </div>
                        <button
                          onClick={() => handleSecurityUpdate('login_alerts', !security.login_alerts)}
                          className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                            security.login_alerts ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              security.login_alerts ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Data & Privacy */}
            {activeSection === 'data' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center mb-6">
                    <FileText className="w-6 h-6 text-indigo-500 mr-3" />
                    <h2 className="text-xl font-semibold">Data & Privacy</h2>
                  </div>
                  <p className="text-gray-600 mb-6">Manage your data and privacy settings</p>
                  
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-3" />
                      Download Your Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="w-4 h-4 mr-3" />
                      Privacy Settings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Lock className="w-4 h-4 mr-3" />
                      Login History
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Account Management */}
            {activeSection === 'danger' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center mb-6">
                    <Settings className="w-6 h-6 text-gray-500 mr-3" />
                    <h2 className="text-xl font-semibold">Account Management</h2>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-red-600 mb-4">Danger Zone</h3>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-900">Delete Account</p>
                          <p className="text-sm text-red-700">
                            Permanently delete your account and all associated data
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Account</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <Button
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Delete Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 