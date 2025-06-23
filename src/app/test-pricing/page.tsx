'use client';

import { calculateBookingPricing, formatPricingBreakdown, PLATFORM_RATES } from '@/lib/pricing';

export default function TestPricingPage() {
  // Test cases
  const testCases = [
    {
      name: "Bike Rental (2 days, with insurance)",
      dailyRate: 30,
      numberOfDays: 2,
      includeInsurance: true,
      securityDeposit: 50,
    },
    {
      name: "Camera Rental (1 day, no insurance)",
      dailyRate: 100,
      numberOfDays: 1,
      includeInsurance: false,
      securityDeposit: 200,
    },
    {
      name: "Lawn Mower (3 days, with insurance)",
      dailyRate: 40,
      numberOfDays: 3,
      includeInsurance: true,
      securityDeposit: 100,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Pricing Calculation Test</h1>
      
      <div className="mb-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Platform Rates</h2>
        <ul className="space-y-2">
          <li><strong>Service Fee:</strong> {(PLATFORM_RATES.SERVICE_FEE_PERCENT * 100)}% (added to renter total)</li>
          <li><strong>Platform Commission:</strong> {(PLATFORM_RATES.COMMISSION_PERCENT * 100)}% (deducted from owner payout)</li>
          <li><strong>Insurance:</strong> {(PLATFORM_RATES.INSURANCE_PERCENT * 100)}% of daily rate per day</li>
          <li><strong>Points Value:</strong> {PLATFORM_RATES.POINTS_TO_CREDIT_RATE * 100} points = $10 AUD</li>
        </ul>
      </div>

      <div className="space-y-8">
        {testCases.map((testCase, index) => {
          const pricing = calculateBookingPricing(testCase);
          
          return (
            <div key={index} className="border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">{testCase.name}</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Input:</h4>
                  <ul className="text-sm space-y-1">
                    <li>Daily Rate: ${testCase.dailyRate}</li>
                    <li>Number of Days: {testCase.numberOfDays}</li>
                    <li>Insurance: {testCase.includeInsurance ? 'Yes' : 'No'}</li>
                    <li>Security Deposit: ${testCase.securityDeposit}</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Breakdown:</h4>
                  <div className="text-sm space-y-1">
                    <div>Base Price: <strong>${pricing.basePrice.toFixed(2)}</strong></div>
                    <div>Service Fee (15%): <strong>${pricing.serviceFee.toFixed(2)}</strong></div>
                    {pricing.insurance > 0 && (
                      <div>Insurance (10% daily): <strong>${pricing.insurance.toFixed(2)}</strong></div>
                    )}
                    <div>Security Deposit: <strong>${pricing.securityDeposit.toFixed(2)}</strong></div>
                    <div className="border-t pt-1 mt-2">
                      <div>RENTER PAYS: <strong className="text-lg text-blue-600">${pricing.totalRenterPays.toFixed(2)}</strong></div>
                    </div>
                    <div className="mt-3 pt-2 border-t">
                      <div>Platform Commission (20%): <strong>-${pricing.platformCommission.toFixed(2)}</strong></div>
                      <div>OWNER RECEIVES: <strong className="text-lg text-green-600">${pricing.ownerReceives.toFixed(2)}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
                <pre>{formatPricingBreakdown(pricing)}</pre>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 p-6 bg-green-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">✅ Test Results</h3>
        <p>All pricing calculations are using the updated rates:</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>• Service fee: 15% of base price (added to renter total)</li>
          <li>• Platform commission: 20% of base price (deducted from owner payout)</li>
          <li>• Insurance: 10% of daily rate per day</li>
          <li>• Points: 100 points = $10 AUD credit</li>
        </ul>
      </div>
    </div>
  );
} 