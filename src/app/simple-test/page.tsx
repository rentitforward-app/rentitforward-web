import { formatPrice } from '@/lib/pricing-constants';

export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Simple Test Page
        </h1>
        <p className="text-gray-600 mb-4">
          Testing basic setup and shared utilities.
        </p>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Price Formatting Test</h2>
          <p>Daily rate: {formatPrice(45)}</p>
          <p>Weekly rate: {formatPrice(280)}</p>
          <p>Security deposit: {formatPrice(200)}</p>
        </div>

        <div className="mt-4 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Calendar Component Status</h2>
          <ul className="space-y-1 text-sm">
            <li>✅ Shared utilities imported successfully</li>
            <li>🔄 Calendar component development in progress</li>
            <li>🔄 API endpoints being configured</li>
          </ul>
        </div>
      </div>
    </div>
  );
}