'use client';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card } from '@/components/ui/Card';
import { Settings, Bell, Shield, User, CreditCard } from 'lucide-react';

export default function SettingsPage() {
  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and settings</p>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <User className="w-6 h-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Account Settings</h2>
            </div>
            <p className="text-gray-600 mb-4">Update your personal information and account details</p>
            <button className="btn-primary px-4 py-2 text-white rounded-lg hover:bg-green-600">
              Edit Profile
            </button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Bell className="w-6 h-6 text-yellow-500 mr-3" />
              <h2 className="text-xl font-semibold">Notification Preferences</h2>
            </div>
            <p className="text-gray-600 mb-4">Choose how you want to receive notifications</p>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                <span>Email notifications for bookings</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                <span>SMS notifications for urgent updates</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" />
                <span>Marketing emails</span>
              </label>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-green-500 mr-3" />
              <h2 className="text-xl font-semibold">Privacy & Security</h2>
            </div>
            <p className="text-gray-600 mb-4">Manage your privacy settings and security preferences</p>
            <div className="space-y-3">
              <button className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                Change Password
              </button>
              <button className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                Two-Factor Authentication
              </button>
              <button className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                Login History
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <CreditCard className="w-6 h-6 text-purple-500 mr-3" />
              <h2 className="text-xl font-semibold">Payment Settings</h2>
            </div>
            <p className="text-gray-600 mb-4">Manage your payment methods and billing information</p>
            <button className="btn-outline px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Manage Payment Methods
            </button>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 