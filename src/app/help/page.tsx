'use client';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card } from '@/components/ui/Card';
import { HelpCircle, Mail, Phone, MessageCircle } from 'lucide-react';

export default function HelpPage() {
  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
          <p className="text-gray-600">Get help with your Rent It Forward account and rentals</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <HelpCircle className="w-8 h-8 text-green-500 mr-3" />
              <h2 className="text-xl font-semibold">FAQ</h2>
            </div>
            <p className="text-gray-600 mb-4">Find answers to commonly asked questions</p>
            <button className="btn-primary px-4 py-2 text-white rounded-lg hover:bg-green-600">
              Browse FAQ
            </button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Mail className="w-8 h-8 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Email Support</h2>
            </div>
            <p className="text-gray-600 mb-4">Send us an email and we'll get back to you</p>
            <button className="btn-outline px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Contact Us
            </button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="w-8 h-8 text-purple-500 mr-3" />
              <h2 className="text-xl font-semibold">Live Chat</h2>
            </div>
            <p className="text-gray-600 mb-4">Chat with our support team in real-time</p>
            <button className="btn-outline px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Start Chat
            </button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Phone className="w-8 h-8 text-orange-500 mr-3" />
              <h2 className="text-xl font-semibold">Phone Support</h2>
            </div>
            <p className="text-gray-600 mb-4">Call us for urgent support matters</p>
            <p className="text-sm text-gray-500">Available Mon-Fri 9AM-5PM AEST</p>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 