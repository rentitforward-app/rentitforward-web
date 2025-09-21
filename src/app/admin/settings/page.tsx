'use client';

import { useState } from 'react';
import { 
  Settings,
  Shield,
  Mail,
  DollarSign,
  Globe,
  Bell,
  Users,
  Package,
  Save,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAdmin } from '@/hooks/use-admin';
import { NotificationSettings } from '@/components/admin/NotificationSettings';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    siteName: 'Rent It Forward',
    siteDescription: 'Peer-to-peer rental marketplace',
    commissionRate: 20.0, // Updated to match our business model
    serviceFee: 15.0, // Service fee for renters
    insuranceFee: 10.0, // Insurance fee percentage
    minTrustScore: 60,
    autoApproveListings: false,
    emailNotifications: true,
    smsNotifications: false,
    maintenanceMode: false
  });
  
  const { isAdmin, loading: adminLoading } = useAdmin();

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'platform', label: 'Platform', icon: Globe }
  ];

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    console.log('Saving settings:', settings);
    // Implement settings save logic
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure platform settings and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="mr-3 h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={settings.siteName}
                      onChange={(e) => handleSettingChange('siteName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Description
                    </label>
                    <input
                      type="text"
                      value={settings.siteDescription}
                      onChange={(e) => handleSettingChange('siteDescription', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Enable to temporarily disable public access for maintenance
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Payment Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      value={settings.commissionRate}
                      onChange={(e) => handleSettingChange('commissionRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Platform commission deducted from owner earnings
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Fee (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="25"
                      value={settings.serviceFee}
                      onChange={(e) => handleSettingChange('serviceFee', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Service fee added to renter's total
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Fee (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={settings.insuranceFee}
                      onChange={(e) => handleSettingChange('insuranceFee', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Insurance fee for damage protection
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Stripe Configuration</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Publishable Key
                      </label>
                      <input
                        type="text"
                        placeholder="pk_live_..."
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        placeholder="sk_live_..."
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Trust Score for Bookings
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.minTrustScore}
                    onChange={(e) => handleSettingChange('minTrustScore', parseInt(e.target.value))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum trust score required to make bookings
                  </p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoApproveListings}
                      onChange={(e) => handleSettingChange('autoApproveListings', e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-approve listings from verified users</span>
                  </label>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Content Moderation</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                      <span className="ml-2 text-sm text-yellow-800">Enable automatic content filtering</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                      <span className="ml-2 text-sm text-yellow-800">Require manual review for flagged content</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <NotificationSettings />
              </div>
            )}

            {activeTab === 'platform' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Platform Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3 flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      User Management
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-green-800">Auto-verification</span>
                        <span className="text-sm font-medium">Enabled</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-800">Max listings per user</span>
                        <span className="text-sm font-medium">25</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Listing Management
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-800">Auto-approval</span>
                        <span className="text-sm font-medium">Disabled</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-800">Max photos per listing</span>
                        <span className="text-sm font-medium">10</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-700 mb-3">
                    These actions are irreversible. Please proceed with caution.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      Clear all caches
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      Reset all user sessions
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 