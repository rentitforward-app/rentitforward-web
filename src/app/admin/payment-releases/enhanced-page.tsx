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
  Eye,
  ExternalLink
} from 'lucide-react';

interface EnhancedBookingForRelease {
  id: string;
  listing: {
    title: string;
    daily_rate: number;
    category: string;
    images?: string[];
  };
  renter: {
    full_name: string;
    email: string;
    id: string;
  };
  owner: {
    full_name: string;
    email: string;
    id: string;
    stripe_account_id?: string;
  };
  start_date: string;
  end_date: string;
  total_amount: number;
  subtotal: number;
  service_fee: number;
  deposit_amount?: number;
  platform_commission: number;
  owner_payout: number;
  return_confirmed_at?: string;
  owner_receipt_confirmed_at?: string;
  completed_at?: string;
  admin_released_at?: string;
  payment_status: string;
  release_status: 'pending' | 'ready' | 'processing' | 'released' | 'failed' | 'refund_requested' | 'disputed';
  has_issues?: boolean;
  damage_report?: string;
  has_stripe_account: boolean;
}

interface PaymentReleaseData {
  total: number;
  pending_review: number;
  ready_for_release: number;
  released: number;
  disputed: number;
  refund_requests: number;
  bookings: EnhancedBookingForRelease[];
}

const RELEASE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'ready', label: 'Ready for Release' },
  { value: 'processing', label: 'Processing' },
  { value: 'released', label: 'Released' },
  { value: 'failed', label: 'Failed' },
  { value: 'refund_requested', label: 'Refund Requested' },
  { value: 'disputed', label: 'Disputed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount_high', label: 'Amount: High to Low' },
  { value: 'amount_low', label: 'Amount: Low to High' },
  { value: 'due_date', label: 'Due Date' },
];

export default function EnhancedPaymentReleasesPage() {
  const router = useRouter();
  const [data, setData] = useState<PaymentReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchPaymentReleases = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/payment-releases');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching payment releases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentReleases();
  }, []);

  const handleRowClick = (bookingId: string) => {
    router.push(`/admin/bookings/${bookingId}`);
  };

  const filteredAndSortedBookings = data?.bookings?.filter(booking => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        booking.listing.title.toLowerCase().includes(query) ||
        booking.renter.full_name.toLowerCase().includes(query) ||
        booking.owner.full_name.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (booking.release_status !== statusFilter) return false;
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const bookingDate = new Date(booking.completed_at || booking.start_date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      if (bookingDate < startDate || bookingDate > endDate) return false;
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
      case 'due_date':
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      default: // newest
        return new Date(b.completed_at || b.start_date).getTime() - new Date(a.completed_at || a.start_date).getTime();
    }
  }) || [];

  const getStatusBadge = (status: string, hasIssues?: boolean) => {
    if (hasIssues) {
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Disputed</Badge>;
    }
    
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'ready':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Ready</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'released':
        return <Badge className="bg-purple-100 text-purple-800"><DollarSign className="w-3 h-3 mr-1" />Released</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'refund_requested':
        return <Badge className="bg-orange-100 text-orange-800"><FileText className="w-3 h-3 mr-1" />Refund Requested</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Releases</h1>
            <p className="text-gray-600 mt-1">Manage payment releases and disputes</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {RELEASE_STATUS_OPTIONS.map(option => (
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Total</h3>
          <p className="text-2xl font-bold text-blue-600">{data?.total || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Pending Review</h3>
          <p className="text-2xl font-bold text-yellow-600">{data?.pending_review || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Ready</h3>
          <p className="text-2xl font-bold text-green-600">{data?.ready_for_release || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Released</h3>
          <p className="text-2xl font-bold text-purple-600">{data?.released || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Disputed</h3>
          <p className="text-2xl font-bold text-red-600">{data?.disputed || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600">Refund Requests</h3>
          <p className="text-2xl font-bold text-orange-600">{data?.refund_requests || 0}</p>
        </Card>
      </div>

      {/* Results Info */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredAndSortedBookings.length} of {data?.bookings?.length || 0} bookings
        </p>
        {selectedBookings.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Bulk Release ({selectedBookings.length})
            </Button>
            <Button variant="outline" size="sm">
              Mark as Disputed
            </Button>
          </div>
        )}
      </div>

      {/* Bookings Table */}
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
                        setSelectedBookings(filteredAndSortedBookings.map(b => b.id));
                      } else {
                        setSelectedBookings([]);
                      }
                    }}
                    checked={selectedBookings.length === filteredAndSortedBookings.length && filteredAndSortedBookings.length > 0}
                  />
                </th>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Participants</th>
                <th className="px-4 py-3 text-left">Financial</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Timeline</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(booking.id)}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedBookings.includes(booking.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedBookings([...selectedBookings, booking.id]);
                        } else {
                          setSelectedBookings(selectedBookings.filter(id => id !== booking.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        {booking.listing.images?.[0] ? (
                          <Image
                            src={booking.listing.images[0]}
                            alt={booking.listing.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{booking.listing.title}</p>
                        <p className="text-sm text-gray-500">ID: {booking.id.slice(0, 8)}...</p>
                        <p className="text-xs text-gray-400">{booking.listing.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-sm"><strong>Renter:</strong> {booking.renter.full_name}</p>
                      <p className="text-sm"><strong>Owner:</strong> {booking.owner.full_name}</p>
                      <p className="text-xs text-gray-500">
                        Stripe: {booking.has_stripe_account ? '✓ Connected' : '✗ Not Connected'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-medium">{formatPrice(booking.total_amount)}</p>
                      <p className="text-sm text-gray-600">Owner: {formatPrice(booking.owner_payout)}</p>
                      <p className="text-xs text-gray-500">Fee: {formatPrice(booking.service_fee)}</p>
                      {booking.deposit_amount && (
                        <p className="text-xs text-gray-500">Deposit: {formatPrice(booking.deposit_amount)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      {getStatusBadge(booking.release_status, booking.has_issues)}
                      {booking.damage_report && (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Damage Report
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1 text-xs text-gray-500">
                      {booking.completed_at && (
                        <p>Completed: {formatDateTime(booking.completed_at)}</p>
                      )}
                      {booking.owner_receipt_confirmed_at && (
                        <p>Receipt: {formatDateTime(booking.owner_receipt_confirmed_at)}</p>
                      )}
                      {booking.admin_released_at && (
                        <p>Released: {formatDateTime(booking.admin_released_at)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/bookings/${booking.id}`);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      {booking.release_status === 'ready' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle individual release
                          }}
                        >
                          Release
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredAndSortedBookings.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
}


