'use client';

import { useState, useEffect } from 'react';
import { useOneSignal } from './OneSignalProvider';

export function OneSignalTest() {
  const {
    requestPermission,
    promptForPermission,
    isSubscribed,
    subscribe,
    unsubscribe,
    setNotificationPreferences,
    getSubscriptionId,
    getOneSignalId,
  } = useOneSignal();

  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [oneSignalId, setOneSignalId] = useState<string | null>(null);
  const [status, setStatus] = useState('Checking OneSignal status...');

  useEffect(() => {
    const checkStatus = () => {
      const currentlySubscribed = isSubscribed();
      const currentSubscriptionId = getSubscriptionId();
      const currentOneSignalId = getOneSignalId();
      
      setSubscribed(currentlySubscribed);
      setSubscriptionId(currentSubscriptionId);
      setOneSignalId(currentOneSignalId);
      
      if (currentlySubscribed) {
        setStatus('✅ Successfully subscribed to push notifications');
      } else {
        setStatus('❌ Not subscribed to push notifications');
      }
    };

    // Check status immediately and then every 2 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    // Listen for OneSignal events
    const handleSubscriptionChange = (event: any) => {
      console.log('Subscription changed:', event.detail);
      checkStatus();
    };

    const handlePermissionChange = (event: any) => {
      console.log('Permission changed:', event.detail);
      checkStatus();
    };

    window.addEventListener('onesignal-subscription-changed', handleSubscriptionChange);
    window.addEventListener('onesignal-permission-changed', handlePermissionChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('onesignal-subscription-changed', handleSubscriptionChange);
      window.removeEventListener('onesignal-permission-changed', handlePermissionChange);
    };
  }, [isSubscribed, getSubscriptionId, getOneSignalId]);

  const handleRequestPermission = async () => {
    try {
      setStatus('Requesting permission...');
      const granted = await requestPermission();
      if (granted) {
        setStatus('✅ Permission granted!');
      } else {
        setStatus('❌ Permission denied');
      }
    } catch (error) {
      setStatus('❌ Error requesting permission');
      console.error(error);
    }
  };

  const handlePromptForPermission = async () => {
    try {
      setStatus('Showing permission prompt...');
      await promptForPermission();
      setStatus('✅ Prompt shown');
    } catch (error) {
      setStatus('❌ Error showing prompt');
      console.error(error);
    }
  };

  const handleSubscribe = async () => {
    try {
      setStatus('Subscribing...');
      await subscribe();
      setStatus('✅ Subscribed!');
    } catch (error) {
      setStatus('❌ Error subscribing');
      console.error(error);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setStatus('Unsubscribing...');
      await unsubscribe();
      setStatus('✅ Unsubscribed');
    } catch (error) {
      setStatus('❌ Error unsubscribing');
      console.error(error);
    }
  };

  const handleSetPreferences = async () => {
    try {
      setStatus('Setting preferences...');
      await setNotificationPreferences({
        booking_notifications: true,
        message_notifications: true,
        payment_notifications: false,
        review_notifications: true,
        system_notifications: true,
        marketing_notifications: false,
      });
      setStatus('✅ Preferences updated');
    } catch (error) {
      setStatus('❌ Error setting preferences');
      console.error(error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">OneSignal Integration Test</h2>
      
      {/* Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Status:</h3>
        <p className="text-sm">{status}</p>
        <div className="mt-2 text-xs text-gray-600">
          <p><strong>Subscribed:</strong> {subscribed ? 'Yes' : 'No'}</p>
          <p><strong>Subscription ID:</strong> {subscriptionId || 'None'}</p>
          <p><strong>OneSignal ID:</strong> {oneSignalId || 'None'}</p>
          <p><strong>App ID:</strong> {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'Not configured'}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleRequestPermission}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Request Permission
        </button>

        <button
          onClick={handlePromptForPermission}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Show Slidedown Prompt
        </button>

        <button
          onClick={handleSubscribe}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Subscribe
        </button>

        <button
          onClick={handleUnsubscribe}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Unsubscribe
        </button>

        <button
          onClick={handleSetPreferences}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors md:col-span-2"
        >
          Set Test Preferences
        </button>
      </div>

      {/* Browser Console Instructions */}
      <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
        <h3 className="font-semibold mb-2">📝 Testing Instructions:</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Open browser developer tools (F12) and check the Console tab</li>
          <li>Look for OneSignal initialization messages</li>
          <li>Click "Request Permission" to test browser permission</li>
          <li>Click "Show Slidedown Prompt" to test OneSignal's custom prompt</li>
          <li>Try subscribing/unsubscribing and watch console logs</li>
                     <li>Check Application → Local Storage to see stored OneSignal data</li>
        </ol>
      </div>

      {/* Expected Console Messages */}
      <div className="mt-4 p-4 bg-green-100 rounded-lg">
        <h3 className="font-semibold mb-2">✅ Expected Console Messages:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>"OneSignal SDK loaded, setting up event listeners..."</li>
          <li>"OneSignal event listeners set up successfully"</li>
          <li>"OneSignal initialization completed"</li>
          <li>Subscription and permission change events</li>
        </ul>
      </div>
    </div>
  );
} 