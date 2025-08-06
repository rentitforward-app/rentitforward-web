'use client';

import { useState } from 'react';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { PricingBreakdown } from '@/components/booking/PricingBreakdown';
import { DateRangeSelection } from '@/lib/calendar-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// Mock listing data for testing
const mockListing = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Professional Camera Kit',
  price: 45,
  weeklyRate: 280,
  securityDeposit: 200,
  insurance: true,
  images: ['/placeholder-item.jpg'],
  location: { city: 'Sydney', state: 'NSW' }
};

export default function TestCalendarPage() {
  const [selectedDates, setSelectedDates] = useState<DateRangeSelection>({
    startDate: null,
    endDate: null,
    duration: 0
  });
  const [hasInsurance, setHasInsurance] = useState(false);
  const [pointsApplied, setPointsApplied] = useState(0);

  const handleDatesSelected = (selection: DateRangeSelection) => {
    setSelectedDates(selection);
    console.log('Dates selected:', selection);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Calendar Component Test
          </h1>
          <p className="text-gray-600">
            Testing the new Airbnb-style availability calendar and pricing breakdown
          </p>
          <Badge variant="outline" className="mt-2">
            Phase 1 Implementation
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Component */}
          <div className="space-y-6">
            <AvailabilityCalendar
              listingId={mockListing.id}
              onDatesSelected={handleDatesSelected}
              className="w-full"
            />
            
            {/* Selection Summary */}
            {selectedDates.startDate && selectedDates.endDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selection Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Start Date:</span>
                      <span className="font-medium">
                        {selectedDates.startDate.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>End Date:</span>
                      <span className="font-medium">
                        {selectedDates.endDate.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">
                        {selectedDates.duration} day{selectedDates.duration !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pricing Component */}
          <div className="space-y-6">
            {selectedDates.duration > 0 ? (
              <PricingBreakdown
                basePrice={mockListing.price}
                duration={selectedDates.duration}
                hasWeeklyRate={true}
                weeklyRate={mockListing.weeklyRate}
                hasInsurance={hasInsurance}
                onInsuranceChange={setHasInsurance}
                securityDeposit={mockListing.securityDeposit}
                pointsBalance={150} // Mock 150 points = $15 credit
                pointsApplied={pointsApplied}
                onPointsAppliedChange={setPointsApplied}
                showOwnerEarnings={true}
                className="w-full"
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">
                    Select dates to see pricing breakdown
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Mock Item Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mock Item Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Daily Rate:</span>
                    <span className="font-medium">${mockListing.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekly Rate:</span>
                    <span className="font-medium">${mockListing.weeklyRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Deposit:</span>
                    <span className="font-medium">${mockListing.securityDeposit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium">
                      {mockListing.location.city}, {mockListing.location.state}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Implementation Notes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Calendar component with real-time availability checking</p>
              <p>✅ Pricing breakdown with updated fee structure (15% service fee, 20% commission)</p>
              <p>✅ Weekly rate calculation for 7+ day rentals</p>
              <p>✅ Insurance toggle (10% of base amount)</p>
              <p>✅ Points/credits system integration</p>
              <p>✅ Security deposit handling</p>
              <p>✅ Database schema created with availability tracking</p>
              <p>🔄 Next: Owner approval workflow and OneSignal notifications</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}