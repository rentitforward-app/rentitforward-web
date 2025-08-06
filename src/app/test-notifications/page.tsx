import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export default function TestNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔔 OneSignal Integration Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This is a demonstration of the OneSignal push notification system integrated 
            with our booking workflow. Users can manage their notification preferences 
            and receive real-time updates.
          </p>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-3xl mx-auto">
            <h3 className="font-semibold text-blue-800 mb-3">🎯 OneSignal Features Implemented:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700 text-left">
              <ul className="space-y-2">
                <li>• <strong>Web Push Notifications:</strong> Browser-based notifications</li>
                <li>• <strong>Booking Workflow Integration:</strong> Automated notifications</li>
                <li>• <strong>User Preference Management:</strong> Customizable settings</li>
                <li>• <strong>Player ID Management:</strong> Cross-platform tracking</li>
              </ul>
              <ul className="space-y-2">
                <li>• <strong>Notification Categories:</strong> Booking, payment, reminders</li>
                <li>• <strong>Real-time Delivery:</strong> Instant push notifications</li>
                <li>• <strong>Email Fallback:</strong> Backup delivery method</li>
                <li>• <strong>Analytics & Logging:</strong> Delivery tracking</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <NotificationPreferences />
        </div>
        
        <div className="mt-12 p-6 bg-green-50 border border-green-200 rounded-lg max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-green-800 mb-4">📱 Notification Workflow Integration</h3>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-green-700 mb-3">🏠 For Owners:</h4>
              <ul className="space-y-2 text-green-600">
                <li>• <strong>New Booking Request:</strong> Instant notification with renter details</li>
                <li>• <strong>Response Reminders:</strong> Deadline alerts for approval</li>
                <li>• <strong>Payment Confirmations:</strong> Revenue notifications</li>
                <li>• <strong>Pickup/Return Alerts:</strong> Rental lifecycle management</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-green-700 mb-3">🛍️ For Renters:</h4>
              <ul className="space-y-2 text-green-600">
                <li>• <strong>Booking Approved:</strong> Instant approval notifications</li>
                <li>• <strong>Payment Processed:</strong> Payment confirmation alerts</li>
                <li>• <strong>Pickup Reminders:</strong> 24-hour advance reminders</li>
                <li>• <strong>Return Reminders:</strong> Return deadline notifications</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white rounded border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">🔒 Privacy & Control</h4>
            <div className="text-sm text-green-700 grid md:grid-cols-2 gap-4">
              <ul className="space-y-1">
                <li>• Granular notification preferences</li>
                <li>• Easy enable/disable controls</li>
                <li>• Email backup options</li>
              </ul>
              <ul className="space-y-1">
                <li>• Cross-platform synchronization</li>
                <li>• No marketing spam policy</li>
                <li>• GDPR compliant data handling</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">⚙️ Technical Implementation</h3>
          
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-yellow-700 mb-2">🌐 Web Integration</h4>
              <ul className="space-y-1 text-yellow-600">
                <li>• OneSignal Web SDK</li>
                <li>• React hooks integration</li>
                <li>• Browser permission handling</li>
                <li>• Service worker setup</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-700 mb-2">📱 Mobile Ready</h4>
              <ul className="space-y-1 text-yellow-600">
                <li>• Cross-platform player IDs</li>
                <li>• React Native integration</li>
                <li>• Push token management</li>
                <li>• Deep linking support</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-700 mb-2">🔧 Backend Services</h4>
              <ul className="space-y-1 text-yellow-600">
                <li>• REST API integration</li>
                <li>• Database logging</li>
                <li>• Workflow automation</li>
                <li>• Analytics tracking</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <span className="text-2xl">🎉</span>
            <span className="font-medium">Phase 3: OneSignal Integration Complete!</span>
          </div>
        </div>
      </div>
    </div>
  );
}