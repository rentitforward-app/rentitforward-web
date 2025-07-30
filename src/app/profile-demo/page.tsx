'use client';

import React from 'react';

export default function ProfileDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Demo Page</h1>
        
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <p className="font-medium">Profile Demo Temporarily Disabled</p>
          <p className="text-sm">This demo page has been temporarily disabled to fix admin page issues.</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
          <p className="text-gray-700">
            The admin pages have been restored to their original working state with real Supabase data fetching.
            GraphQL demo pages can be re-enabled once the core functionality is confirmed to be working.
          </p>
        </div>
      </div>
    </div>
  );
} 