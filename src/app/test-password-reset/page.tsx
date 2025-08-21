'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function TestPasswordResetPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [apiDebugInfo, setApiDebugInfo] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const gatherDebugInfo = async () => {
      const info: any = {};
      
      // URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      info.urlParams = {
        code: urlParams.get('code'),
        access_token: urlParams.get('access_token'),
        refresh_token: urlParams.get('refresh_token'),
        type: urlParams.get('type'),
        fullURL: window.location.href
      };
      
      // Supabase configuration
      info.supabaseConfig = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        currentOrigin: window.location.origin
      };
      
      // Session information
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        info.session = {
          hasSession: !!session,
          error: error?.message,
          userId: session?.user?.id,
          sessionType: session?.user?.app_metadata,
          expiresAt: session?.expires_at
        };
      } catch (error) {
        info.session = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
      // User information
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        info.user = {
          hasUser: !!user,
          error: error?.message,
          userId: user?.id,
          email: user?.email
        };
      } catch (error) {
        info.user = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
      setDebugInfo(info);
      setIsLoading(false);
    };

    gatherDebugInfo();
  }, [supabase.auth]);

  const testPasswordReset = async () => {
    const email = prompt('Enter email for password reset test:');
    if (!email) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectUrl = `${baseUrl}/reset-password`;
      
      console.log('Testing password reset with:', { email, redirectUrl });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('Password reset email sent successfully!');
      }
    } catch (error) {
      alert(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testDebugAPI = async () => {
    try {
      const response = await fetch('/api/debug-password-reset');
      const data = await response.json();
      setApiDebugInfo(data);
      console.log('API Debug Info:', data);
    } catch (error) {
      console.error('Error fetching API debug info:', error);
      setApiDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const testAPIPasswordReset = async () => {
    const email = prompt('Enter email for API password reset test:');
    if (!email) return;
    
    try {
      const response = await fetch('/api/debug-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Success: ${data.message}\nRedirect URL: ${data.redirectUrl}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return <div>Loading debug information...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Password Reset Debug Page</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">URL Parameters</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo.urlParams, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Supabase Configuration</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo.supabaseConfig, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Session Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo.session, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">User Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo.user, null, 2)}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Test Password Reset</h2>
          <div className="space-y-2">
            <button
              onClick={testPasswordReset}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
            >
              Test Client Password Reset
            </button>
            <button
              onClick={testAPIPasswordReset}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
            >
              Test API Password Reset
            </button>
            <button
              onClick={testDebugAPI}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Test Debug API
            </button>
          </div>
        </div>
        
        {apiDebugInfo && (
          <div>
            <h2 className="text-lg font-semibold mb-2">API Debug Information</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(apiDebugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
