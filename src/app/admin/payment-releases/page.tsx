'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface BookingForRelease {
  id: string;
  listing: {
    title: string;
    daily_rate: number;
  };
  renter: {
    full_name: string;
    email: string;
  };
  owner: {
    full_name: string;
    email: string;
    stripe_account_id: string;
  };
  start_date: string;
  end_date: string;
  total_amount: number;
  platform_commission: number;
  owner_payout: number;
  return_confirmed_at: string;
  payment_status: string;
}

interface PaymentReleaseData {
  total: number;
  eligible_for_release: number;
  bookings: BookingForRelease[];
  eligible_bookings: BookingForRelease[];
}

export default function PaymentReleasesPage() {
  const [data, setData] = useState<PaymentReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPaymentReleases();
  }, []);

  const fetchPaymentReleases = async () => {
    try {
      const response = await fetch('/api/admin/payment-releases');
      if (response.ok) {
        const releaseData = await response.json();
        setData(releaseData);
      } else {
        console.error('Failed to fetch payment releases');
      }
    } catch (error) {
      console.error('Error fetching payment releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === data?.eligible_bookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(data?.eligible_bookings.map(b => b.id) || []);
    }
  };

  const handleProcessReleases = async () => {
    if (selectedBookings.length === 0) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/payment-releases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_ids: selectedBookings,
          action: 'release',
        }),
      });

      if (response.ok) {
        await fetchPaymentReleases(); // Refresh data
        setSelectedBookings([]);
        alert('Payment releases processed successfully!');
      } else {
        const error = await response.json();
        alert(`Error processing releases: ${error.error}`);
      }
    } catch (error) {
      console.error('Error processing releases:', error);
      alert('Error processing payment releases');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilEligible = (returnDate: string) => {
    const returned = new Date(returnDate);
    const eligible = addWorkingDays(returned, 2);
    const now = new Date();
    
    if (now >= eligible) return 0;
    
    const diffTime = eligible.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Payment Releases</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Payment Releases</h1>
        <Button onClick={fetchPaymentReleases} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700">Total Pending</h3>
          <p className="text-3xl font-bold text-blue-600">{data?.total || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700">Ready for Release</h3>
          <p className="text-3xl font-bold text-green-600">{data?.eligible_for_release || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700">Selected</h3>
          <p className="text-3xl font-bold text-purple-600">{selectedBookings.length}</p>
        </Card>
      </div>

      {data?.eligible_for_release && data.eligible_for_release > 0 && (
        <div className="mb-6 flex gap-4">
          <Button
            onClick={handleSelectAll}
            variant="outline"
          >
            {selectedBookings.length === data.eligible_bookings.length ? 'Deselect All' : 'Select All Eligible'}
          </Button>
          <Button
            onClick={handleProcessReleases}
            disabled={selectedBookings.length === 0 || processing}
            className="bg-green-600 hover:bg-green-700"
          >
            {processing ? 'Processing...' : `Release ${selectedBookings.length} Payment${selectedBookings.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Select</th>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Dates</th>
                <th className="px-4 py-3 text-left">Participants</th>
                <th className="px-4 py-3 text-left">Financial</th>
                <th className="px-4 py-3 text-left">Return Status</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.bookings.map((booking) => {
                const isEligible = data.eligible_bookings.some(eb => eb.id === booking.id);
                const daysUntilEligible = getDaysUntilEligible(booking.return_confirmed_at);
                
                return (
                  <tr key={booking.id} className={isEligible ? 'bg-green-50' : 'bg-yellow-50'}>
                    <td className="px-4 py-3">
                      {isEligible && (
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.id)}
                          onChange={() => handleSelectBooking(booking.id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{booking.listing.title}</div>
                        <div className="text-sm text-gray-500">ID: {booking.id.substring(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div>{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div><strong>Renter:</strong> {booking.renter.full_name}</div>
                        <div><strong>Owner:</strong> {booking.owner.full_name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div><strong>Total:</strong> ${booking.total_amount.toFixed(2)}</div>
                        <div><strong>Owner Gets:</strong> ${booking.owner_payout.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Commission: ${booking.platform_commission.toFixed(2)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div>Returned: {formatDate(booking.return_confirmed_at)}</div>
                        {daysUntilEligible > 0 && (
                          <div className="text-xs text-orange-600">Eligible in {daysUntilEligible} days</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        isEligible 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {isEligible ? 'Ready' : 'Waiting'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(!data?.bookings || data.bookings.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No bookings pending payment release
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Helper function to add working days (matching the API logic)
function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }

  return result;
} 