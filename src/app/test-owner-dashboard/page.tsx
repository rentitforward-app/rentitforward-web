import { OwnerBookingDashboard } from '@/components/booking/OwnerBookingDashboard';

export default function TestOwnerDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏠 Owner Dashboard Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This is a demonstration of the new owner approval workflow. Owners can see 
            pending booking requests, approve/reject them, and manage their rental business.
          </p>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
            <h3 className="font-semibold text-blue-800 mb-2">✨ New Features in Phase 2:</h3>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• <strong>Payment Authorization:</strong> Authorize payment first, capture after approval</li>
              <li>• <strong>Owner Approval Dashboard:</strong> Review and respond to booking requests</li>
              <li>• <strong>Smart Deadlines:</strong> 48-hour approval window with automatic expiry</li>
              <li>• <strong>Real-time Updates:</strong> Instant notifications for status changes</li>
              <li>• <strong>Revenue Analytics:</strong> Track earnings and performance metrics</li>
              <li>• <strong>Tentative Holds:</strong> Prevent double-bookings during approval</li>
            </ul>
          </div>
        </div>

        <OwnerBookingDashboard />
        
        <div className="mt-12 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-3">🎯 How the New Flow Works:</h3>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-green-700 mb-2">For Renters:</h4>
              <ol className="space-y-1 text-green-600">
                <li>1. Select dates and pricing options</li>
                <li>2. Submit booking request with payment authorization</li>
                <li>3. Wait for owner approval (max 48 hours)</li>
                <li>4. Payment captured automatically if approved</li>
                <li>5. Receive confirmation and pickup details</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium text-green-700 mb-2">For Owners:</h4>
              <ol className="space-y-1 text-green-600">
                <li>1. Receive notification of booking request</li>
                <li>2. Review renter details and request info</li>
                <li>3. Approve or decline within 48 hours</li>
                <li>4. Payment automatically processed if approved</li>
                <li>5. Manage pickup and rental lifecycle</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white rounded border border-green-200">
            <div className="text-sm text-green-700">
              <strong>💡 Key Benefits:</strong> Reduces booking abandonment, increases owner control, 
              prevents payment issues, and creates trust through the approval process.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}