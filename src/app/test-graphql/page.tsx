'use client';

import React from 'react';

export default function TestGraphQLPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">GraphQL Test Page</h1>
        
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <p className="font-medium">GraphQL Testing Temporarily Disabled</p>
          <p className="text-sm">This page has been temporarily disabled while fixing admin page issues.</p>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Pages Status</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                <span>Admin Users - Restored with Supabase data fetching</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                <span>Admin Listings - Restored with Supabase data fetching</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                <span>Admin Bookings - Restored with Supabase data fetching</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                <span>Admin Dashboard - Working with real data</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Admin pages now show real data from Supabase</li>
              <li>GraphQL implementation can be properly tested separately</li>
              <li>User management, listing approval, and booking oversight all functional</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 