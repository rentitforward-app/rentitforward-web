'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Camera, 
  Shield, 
  CreditCard, 
  Bell, 
  Lock, 
  Settings, 
  Star,
  CheckCircle,
  XCircle,
  Award,
  Eye,
  EyeOff,
  LogOut,
  Trash2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import StripeConnectSetup from '@/components/payments/StripeConnectSetup';
import { VerificationDashboard } from '@/components/VerificationDashboard';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  state?: string;
  date_of_birth?: string;
  is_verified: boolean;
  stripe_onboarding_complete: boolean;
  created_at: string;
  trust_score?: number;
  completion_rate?: number;
}

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

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    location: '',
    state: '',
    date_of_birth: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
    
    // Check for Stripe return parameters and switch to verification tab
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_return') === 'true' || urlParams.get('stripe_refresh') === 'true') {
      setActiveTab('verification');
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
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Calculate trust score and completion rate
      const enhancedProfile = {
        ...profile,
        trust_score: 87, // Would be calculated based on reviews, completion rate, etc.
        completion_rate: 94
      };

      setProfile(enhancedProfile);
      setEditForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        state: profile.state || '',
        date_of_birth: profile.date_of_birth || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editForm)
        .eq('id', profile?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile & Settings</h1>
            <p className="text-gray-600">Manage your account and preferences</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-2">
                {[
                  { key: 'profile', label: 'Profile', icon: User },
                  { key: 'verification', label: 'Payments & Verification', icon: CreditCard },
                  { key: 'trust', label: 'Trust & Safety', icon: Shield },
                  { key: 'notifications', label: 'Notifications', icon: Bell },
                  { key: 'security', label: 'Security', icon: Lock },
                  { key: 'account', label: 'Account', icon: Settings }
                ].map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.key
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 mr-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Basic Info Card */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>

                  <div className="flex items-start space-x-6 mb-6">
                    <div className="relative">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          width={120}
                          height={120}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-30 h-30 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-12 h-12 text-gray-500" />
                        </div>
                      )}
                      <button className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg border">
                        <Camera className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={editForm.phone}
                              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bio
                            </label>
                            <textarea
                              value={editForm.bio}
                              onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="Tell others about yourself..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Location
                              </label>
                              <input
                                type="text"
                                value={editForm.location}
                                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                State
                              </label>
                              <select
                                value={editForm.state}
                                onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="">Select state</option>
                                <option value="NSW">NSW</option>
                                <option value="VIC">VIC</option>
                                <option value="QLD">QLD</option>
                                <option value="SA">SA</option>
                                <option value="WA">WA</option>
                                <option value="TAS">TAS</option>
                                <option value="NT">NT</option>
                                <option value="ACT">ACT</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-3">
                            <Button onClick={handleProfileUpdate}>
                              Save Changes
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">{profile.full_name}</h3>
                            <p className="text-gray-600">{profile.email}</p>
                          </div>
                          
                          {profile.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {profile.phone}
                            </div>
                          )}
                          
                          {(profile.location || profile.state) && (
                            <div className="flex items-center text-gray-600">
                              <MapPin className="w-4 h-4 mr-2" />
                              {profile.location}{profile.location && profile.state && ', '}{profile.state}
                            </div>
                          )}
                          
                          {profile.bio && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-1">About</h4>
                              <p className="text-gray-600">{profile.bio}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center text-sm text-gray-500">
                            <Award className="w-4 h-4 mr-2" />
                            Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Verification Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        {profile.is_verified ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mr-3" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Identity Verification
                          </p>
                          <p className="text-sm text-gray-500">
                            {profile.is_verified ? 'Verified' : 'Not verified'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {profile.stripe_onboarding_complete ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mr-3" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Payment Setup
                          </p>
                          <p className="text-sm text-gray-500">
                            {profile.stripe_onboarding_complete ? 'Complete' : 'Incomplete'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Payments & Verification Tab */}
            {activeTab === 'verification' && (
              <div className="space-y-6">
                <VerificationDashboard />
              </div>
            )}

            {/* Trust & Safety Tab */}
            {activeTab === 'trust' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Trust Score</h2>
                  
                  <div className="text-center mb-6">
                    <div className={`text-5xl font-bold ${getTrustScoreColor(profile.trust_score || 0)}`}>
                      {profile.trust_score || 0}
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTrustScoreBadge(profile.trust_score || 0).color}`}>
                        {getTrustScoreBadge(profile.trust_score || 0).text}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">Your trust score is based on your activity and feedback</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Completion Rate</span>
                      <span className="font-medium">{profile.completion_rate || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${profile.completion_rate || 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Response Time</span>
                      <span className="font-medium">Excellent</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-4/5"></div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Item Quality</span>
                      <span className="font-medium">Very Good</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full w-3/4"></div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">How to improve your score:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Complete identity verification</li>
                      <li>• Maintain high completion rates</li>
                      <li>• Respond quickly to messages</li>
                      <li>• Provide accurate item descriptions</li>
                      <li>• Receive positive reviews</li>
                    </ul>
                  </div>
                </Card>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Email Notifications</h3>
                      <div className="space-y-3">
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
                      <div className="space-y-3">
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

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                  
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

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Management</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Payment Setup</h3>
                      <StripeConnectSetup 
                        onSetupComplete={() => {
                          loadProfile(); // Refresh profile data after setup
                          toast.success('Payment setup completed!');
                        }}
                      />
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Data & Privacy</h3>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          Download Your Data
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          Privacy Settings
                        </Button>
                      </div>
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