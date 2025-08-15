'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Package,
  X,
  Info,
  Eye
} from 'lucide-react';

interface BookingForRelease {
  id: string;
  status: string;
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
  payment: {
    id: string;
    amount: number;
    platform_fee: number;
    stripe_fee: number;
    net_amount: number;
    status: string;
    stripe_payment_intent_id: string;
    payout_id?: string;
    payout_date?: string;
    refund_id?: string;
    refund_amount?: number;
    refunded_at?: string;
  } | null;
  start_date: string;
  end_date: string;
  total_amount: number;
  subtotal: number;
  service_fee: number;
  deposit_amount: number;
  platform_commission: number;
  owner_payout: number;
  return_confirmed_at: string;
  owner_receipt_confirmed_at: string;
  payment_status: string;
  payout_status: string;
  completed_at: string;
  admin_released_at?: string;
  has_stripe_account: boolean;
  has_payment_intent: boolean;
  has_payment: boolean;
  has_issues?: boolean;
  // Payout calculation fields
  platform_fee: number;
  stripe_fee: number;
  net_payout_amount: number;
}

interface PaymentReleaseData {
  total: number;
  eligible_for_release: number;
  bookings: BookingForRelease[];
  eligible_bookings: BookingForRelease[];
}

export default function PaymentReleasesPage() {
  const router = useRouter();
  const [data, setData] = useState<PaymentReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

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

  const handleRowClick = (bookingId: string) => {
    router.push(`/admin/bookings/${bookingId}`);
  };

  const PAYOUT_STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'awaiting_completion', label: 'Awaiting Completion' },
    { value: 'ready_for_payout', label: 'Ready for Payout' },
    { value: 'manual_payout_required', label: 'Manual Payout Required' },
    { value: 'released', label: 'Payout Released' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'return_pending', label: 'Return Pending' },
    { value: 'disputed', label: 'Disputed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const PAYMENT_STATUS_OPTIONS = [
    { value: 'all', label: 'All Payment Statuses' },
    { value: 'no_payment', label: 'No Payment Record' },
    { value: 'pending', label: 'Payment Pending' },
    { value: 'processing', label: 'Payment Processing' },
    { value: 'succeeded', label: 'Payment Succeeded' },
    { value: 'failed', label: 'Payment Failed' },
    { value: 'cancelled', label: 'Payment Cancelled' },
    { value: 'refunded', label: 'Payment Refunded' },
  ];

  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'amount_high', label: 'Amount: High to Low' },
    { value: 'amount_low', label: 'Amount: Low to High' },
  ];

  // Filter and sort bookings
  const filteredBookings = data?.bookings?.filter(booking => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        booking.listing.title.toLowerCase().includes(query) ||
        booking.renter.full_name.toLowerCase().includes(query) ||
        booking.owner.full_name.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (statusFilter !== 'all') {
      // Use the new payout_status field from API
      if (booking.payout_status !== statusFilter) return false;
    }

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.completed_at || a.start_date).getTime() - new Date(b.completed_at || b.start_date).getTime();
      case 'amount_high':
        return b.total_amount - a.total_amount;
      case 'amount_low':
        return a.total_amount - b.total_amount;
      default: // newest
        return new Date(b.completed_at || b.start_date).getTime() - new Date(a.completed_at || a.start_date).getTime();
    }
  }) || [];

  const getPayoutStatusBadge = (booking: BookingForRelease) => {
    switch (booking.payout_status) {
      case 'released':
        return <Badge className="bg-purple-100 text-purple-800"><DollarSign className="w-3 h-3 mr-1" />Payout Released</Badge>;
      case 'ready_for_payout':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Ready for Payout</Badge>;
      case 'manual_payout_required':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Manual Payout Required</Badge>;
      case 'awaiting_completion':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Awaiting Completion</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600"><Info className="w-3 h-3 mr-1" />{booking.payout_status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (booking: BookingForRelease) => {
    if (!booking.payment) {
      return <Badge className="bg-gray-100 text-gray-800"><X className="w-3 h-3 mr-1" />No Payment Record</Badge>;
    }

    switch (booking.payment.status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Payment Succeeded</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />Payment Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Payment Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><X className="w-3 h-3 mr-1" />Payment Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800"><X className="w-3 h-3 mr-1" />Payment Cancelled</Badge>;
      case 'refunded':
        return <Badge className="bg-orange-100 text-orange-800"><DollarSign className="w-3 h-3 mr-1" />Payment Refunded</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600"><Info className="w-3 h-3 mr-1" />{booking.payment.status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
                  <div>
          <h1 className="text-3xl font-bold">Owner Payouts</h1>
          <p className="text-gray-600 mt-1">Release payouts to owners after completed bookings</p>
        </div>
          <div className="flex gap-2">
            <Button onClick={fetchPaymentReleases} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search bookings, users, or listing titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {PAYOUT_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700">Pending Payouts</h3>
          <p className="text-3xl font-bold text-blue-600">{data?.total || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700">Ready for Payout</h3>
          <p className="text-3xl font-bold text-green-600">{data?.eligible_for_release || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-700">Selected</h3>
          <p className="text-3xl font-bold text-purple-600">{selectedBookings.length}</p>
        </Card>
      </div>

      {/* Results Info and Actions */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredBookings.length} of {data?.bookings?.length || 0} bookings
        </p>
        {selectedBookings.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleProcessReleases}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Processing...' : `Release ${selectedBookings.length} Payout${selectedBookings.length !== 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" size="sm">
              Mark as Disputed
            </Button>
          </div>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBookings(filteredBookings.map(b => b.id));
                      } else {
                        setSelectedBookings([]);
                      }
                    }}
                    checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                  />
                </th>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Timeline</th>
                <th className="px-4 py-3 text-left">Participants</th>
                <th className="px-4 py-3 text-left">Financial</th>
                <th className="px-4 py-3 text-left">Net Payout</th>
                <th className="px-4 py-3 text-left">Return Status</th>
                <th className="px-4 py-3 text-left">Payment Status</th>
                <th className="px-4 py-3 text-left">Payout Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => {
                const daysUntilEligible = getDaysUntilEligible(booking.return_confirmed_at);
                
                return (
                  <tr 
                    key={booking.id} 
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleRowClick(booking.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedBookings.includes(booking.id)}
                        onChange={() => handleSelectBooking(booking.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    {/* Booking Column */}
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-blue-600 hover:text-blue-800">{booking.listing.title}</div>
                        <div className="text-sm text-gray-500">ID: {booking.id.substring(0, 8)}...</div>
                      </div>
                    </td>
                    
                    {/* Timeline Column */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div><strong>Period:</strong> {formatDate(booking.start_date)} - {formatDate(booking.end_date)}</div>
                        {booking.completed_at && (
                          <div className="text-xs text-green-600 mt-1">
                            Completed: {formatDateTime(booking.completed_at)}
                          </div>
                        )}
                        {booking.admin_released_at && (
                          <div className="text-xs text-purple-600 mt-1">
                            Released: {formatDateTime(booking.admin_released_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Participants Column */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div><strong>Renter:</strong> {booking.renter.full_name}</div>
                        <div><strong>Owner:</strong> {booking.owner.full_name}</div>
                      </div>
                    </td>
                    
                    {/* Financial Column */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div><strong>Total:</strong> ${booking.total_amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-600">Subtotal: ${booking.subtotal.toFixed(2)}</div>
                        <div className="text-xs text-gray-600">Service Fee: ${booking.service_fee.toFixed(2)}</div>
                        {booking.deposit_amount > 0 && (
                          <div className="text-xs text-gray-600">Deposit: ${booking.deposit_amount.toFixed(2)}</div>
                        )}
                        <div className="text-green-700 font-medium mt-1">
                          <strong>Owner Gets:</strong> ${booking.owner_payout.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Commission: ${booking.platform_commission.toFixed(2)}</div>
                      </div>
                    </td>
                    
                    {/* Net Payout Column */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-green-600">
                          ${booking.net_payout_amount?.toFixed(2) || (booking.total_amount - booking.platform_commission).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          After {((booking.platform_commission / booking.total_amount) * 100).toFixed(1)}% fee
                        </div>
                        {booking.admin_released_at && (
                          <div className="text-xs text-green-600 mt-1">
                            ✓ Released
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Return Status Column */}
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {booking.owner_receipt_confirmed_at ? (
                          <div>
                            <div className="text-green-600 font-medium">✓ Return Complete</div>
                            <div className="text-xs text-gray-500">Confirmed: {formatDateTime(booking.owner_receipt_confirmed_at)}</div>
                          </div>
                        ) : booking.return_confirmed_at ? (
                          <div>
                            <div className="text-orange-600">Awaiting Owner Confirmation</div>
                            <div className="text-xs text-gray-500">Returned: {formatDateTime(booking.return_confirmed_at)}</div>
                          </div>
                        ) : (
                          <div className="text-orange-600">Pending Return</div>
                        )}
                        {daysUntilEligible > 0 && (
                          <div className="text-xs text-orange-600 mt-1">Eligible in {daysUntilEligible} days</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Payment Status Column */}
                    <td className="px-4 py-3">
                      {getPaymentStatusBadge(booking)}
                    </td>
                    
                    {/* Payout Status Column */}
                    <td className="px-4 py-3">
                      {getPayoutStatusBadge(booking)}
                    </td>
                    
                    {/* Actions Column */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRowClick(booking.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(!filteredBookings || filteredBookings.length === 0) && data?.bookings && data.bookings.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              No bookings match your current filters
            </div>
          )}
          
          {(!data?.bookings || data.bookings.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No payment data available
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