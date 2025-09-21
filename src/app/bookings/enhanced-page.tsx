'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  DollarSign, 
  MessageCircle, 
  Phone,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Search,
  Download,
  Eye,
  MoreHorizontal,
  Star,
  Plus,
  ArrowRight,
  FileText,
  Camera,
  Flag,
  TrendingUp,
  CalendarDays,
  Grid,
  List,
  Zap,
  Timer,
  CheckSquare,
  AlertTriangle,
  ThumbsUp,
  Printer,
  Share,
  Expand,
  RotateCcw,
  Upload
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  pickup_instructions?: string;
  return_instructions?: string;
  pickup_location?: string;
  return_location?: string;
  insurance_selected: boolean;
  deposit_amount?: number;
  deposit_status?: 'held' | 'released' | 'returned';
  condition_before?: string;
  condition_after?: string;
  photos_before?: string[];
  photos_after?: string[];
  damage_report?: string;
  extension_requests?: Array<{
    id: string;
    new_end_date: string;
    additional_cost: number;
    status: 'pending' | 'approved' | 'denied';
    requested_at: string;
  }>;
  issues_reported?: Array<{
    id: string;
    issue: string;
    reported_at: string;
    resolved: boolean;
  }>;
  reviews?: {
    renter_review?: {
      rating: number;
      comment: string;
      created_at: string;
    };
    owner_review?: {
      rating: number;
      comment: string;
      created_at: string;
    };
  };
  listing: {
    id: string;
    title: string;
    images: string[];
    daily_rate: number;
    category: string;
    owner_id: string;
  };
  renter?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
    phone?: string;
  };
  owner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
    phone?: string;
  };
}

export default function EnhancedBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'as_owner' | 'as_renter'>('as_owner');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'past' | 'all'>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showEarningsPanel, setShowEarningsPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadBookings();
  }, [userRole]);

  useEffect(() => {
    filterBookings();
  }, [bookings, activeTab, statusFilter, searchTerm, sortBy]);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Enhanced mock data with all new fields
      const mockBookings: Booking[] = [
        {
          id: '1',
          start_date: '2024-12-05',
          end_date: '2024-12-10',
          total_amount: 250,
          status: 'confirmed',
          created_at: '2024-11-20T10:00:00Z',
          insurance_selected: true,
          deposit_amount: 100,
          deposit_status: 'held',
          pickup_location: '123 Collins St, Melbourne VIC',
          return_location: '123 Collins St, Melbourne VIC',
          condition_before: 'Excellent condition, all accessories included',
          listing: {
            id: '1',
            title: 'Professional DSLR Camera Kit',
            images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K'],
            daily_rate: 50,
            category: 'Photography',
            owner_id: 'owner1'
          },
          renter: {
            id: 'renter1',
            full_name: 'Sarah Johnson',
            email: 'sarah@example.com',
            phone: '+61 400 123 456'
          }
        },
        {
          id: '2',
          start_date: '2024-11-25',
          end_date: '2024-11-30',
          total_amount: 300,
          status: 'active',
          created_at: '2024-11-15T14:30:00Z',
          insurance_selected: false,
          deposit_amount: 50,
          deposit_status: 'held',
          pickup_location: '456 Swanston St, Melbourne VIC',
          return_location: '456 Swanston St, Melbourne VIC',
          condition_before: 'Good condition, minor wear on pedals',
          issues_reported: [{
            id: '1',
            issue: 'Chain was making noise, but still rideable',
            reported_at: '2024-11-27T10:00:00Z',
            resolved: false
          }],
          listing: {
            id: '2',
            title: 'Mountain Bike - Trek X-Caliber',
            images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K'],
            daily_rate: 60,
            category: 'Sports',
            owner_id: 'owner2'
          },
          owner: {
            id: 'owner2',
            full_name: 'Mike Chen',
            email: 'mike@example.com',
            phone: '+61 400 789 012'
          }
        },
        {
          id: '3',
          start_date: '2024-10-15',
          end_date: '2024-10-20',
          total_amount: 180,
          status: 'completed',
          created_at: '2024-10-10T08:00:00Z',
          insurance_selected: true,
          deposit_amount: 75,
          deposit_status: 'returned',
          pickup_location: '789 Chapel St, South Yarra VIC',
          return_location: '789 Chapel St, South Yarra VIC',
          condition_before: 'Like new condition',
          condition_after: 'Returned in excellent condition',
          reviews: {
            renter_review: {
              rating: 5,
              comment: 'Great equipment, owner was very helpful!',
              created_at: '2024-10-21T10:00:00Z'
            }
          },
          listing: {
            id: '3',
            title: 'Camping Tent for 4 People',
            images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K'],
            daily_rate: 35,
            category: 'Camping',
            owner_id: 'owner3'
          },
          renter: {
            id: 'renter2',
            full_name: 'Alex Thompson',
            email: 'alex@example.com',
            phone: '+61 400 555 123'
          }
        }
      ];

      setBookings(mockBookings);

    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;
    const now = new Date();

    // Filter by timeline category
    if (activeTab !== 'all') {
      filtered = filtered.filter(booking => {
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        
        switch (activeTab) {
          case 'upcoming':
            return isAfter(startDate, now) && (booking.status === 'confirmed' || booking.status === 'pending');
          case 'active':
            return booking.status === 'active' || (isBefore(startDate, now) && isAfter(endDate, now));
          case 'past':
            return booking.status === 'completed' || booking.status === 'cancelled' || isBefore(endDate, now);
          default:
            return true;
        }
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.renter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.listing.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort bookings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'amount':
          return b.total_amount - a.total_amount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredBookings(filtered);
  };

  const getDaysRemaining = (booking: Booking) => {
    const now = new Date();
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    
    if (booking.status === 'active' || (isBefore(startDate, now) && isAfter(endDate, now))) {
      return {
        type: 'return',
        days: differenceInDays(endDate, now),
        text: `${differenceInDays(endDate, now)} days until return`
      };
    } else if (isAfter(startDate, now)) {
      return {
        type: 'pickup',
        days: differenceInDays(startDate, now),
        text: `${differenceInDays(startDate, now)} days until pickup`
      };
    }
    return null;
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: newStatus as any }
            : booking
        )
      );
      toast.success(`Booking ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const getTotalEarnings = () => {
    return bookings
      .filter(b => userRole === 'as_owner' && (b.status === 'completed' || b.status === 'active'))
      .reduce((total, booking) => total + booking.total_amount, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'active':
        return <Zap className="w-4 h-4" />;
      case 'completed':
        return <CheckSquare className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Rental Management</h1>
            <p className="text-gray-600">Comprehensive rental tracking and management system</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => setShowEarningsPanel(!showEarningsPanel)}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Earnings
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={() => router.push('/browse')}>
              Browse Items
            </Button>
          </div>
        </div>

        {/* Earnings Panel */}
        {showEarningsPanel && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Earnings Overview</h3>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatPrice(getTotalEarnings())}</p>
                <p className="text-sm text-gray-500">Total Earnings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{bookings.filter(b => b.status === 'active').length}</p>
                <p className="text-sm text-gray-500">Active Rentals</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{bookings.filter(b => b.status === 'completed').length}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {formatPrice(bookings.filter(b => b.deposit_status === 'held').reduce((total, b) => total + (b.deposit_amount || 0), 0))}
                </p>
                <p className="text-sm text-gray-500">Deposits Held</p>
              </div>
            </div>
          </Card>
        )}

        {/* Role Toggle */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md">
            <button
              onClick={() => setUserRole('as_owner')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                userRole === 'as_owner'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="h-4 w-4 mr-2" />
              My Items
            </button>
            <button
              onClick={() => setUserRole('as_renter')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                userRole === 'as_renter'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              My Bookings
            </button>
          </div>
        </div>

        {/* Timeline Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Timer className="h-4 w-4 mr-2 inline" />
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap className="h-4 w-4 mr-2 inline" />
              Active
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'past'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckSquare className="h-4 w-4 mr-2 inline" />
              Past
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-4 w-4 mr-2 inline" />
              All
            </button>
          </div>
        </div>

        {/* Enhanced Filters & Actions */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by item, renter, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-green-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'calendar' 
                      ? 'bg-white text-green-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
              </div>
              
              {selectedBookings.length > 0 && (
                <Button variant="outline" size="sm">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Bulk Actions ({selectedBookings.length})
                </Button>
              )}
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={loadBookings}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Enhanced Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const contactPerson = userRole === 'as_owner' ? booking.renter : booking.owner;
              const daysRemaining = getDaysRemaining(booking);

              return (
                <Card key={booking.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex space-x-4 flex-1">
                      {/* Checkbox for bulk selection */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookings(prev => [...prev, booking.id]);
                            } else {
                              setSelectedBookings(prev => prev.filter(id => id !== booking.id));
                            }
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </div>

                      {/* Item Image */}
                      <div className="w-20 h-20 flex-shrink-0">
                        <Image
                          src={booking.listing.images[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K'}
                          alt={booking.listing.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Enhanced Booking Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {booking.listing.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {userRole === 'as_owner' ? 'Rented to' : 'Rented from'}: {contactPerson?.full_name}
                            </p>
                            {booking.issues_reported && booking.issues_reported.length > 0 && (
                              <div className="flex items-center text-orange-600 text-sm mt-1">
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                {booking.issues_reported.length} issue(s) reported
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              <span className="ml-1">{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                            </span>
                          </div>
                        </div>

                        {/* Enhanced Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <div>
                              <p className="font-medium">Start Date</p>
                              <p>{format(new Date(booking.start_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-2" />
                            <div>
                              <p className="font-medium">End Date</p>
                              <p>{format(new Date(booking.end_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 mr-2" />
                            <div>
                              <p className="font-medium">Total Amount</p>
                              <p className="text-lg font-semibold text-green-600">
                                {formatPrice(booking.total_amount)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            <div>
                              <p className="font-medium">Location</p>
                              <p className="truncate">{booking.pickup_location || 'TBD'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Days Remaining & Additional Info */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4 text-sm">
                            {daysRemaining && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                daysRemaining.type === 'return' 
                                  ? daysRemaining.days <= 1 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                <Timer className="w-3 h-3 mr-1" />
                                {daysRemaining.text}
                              </span>
                            )}
                            {booking.insurance_selected && (
                              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs">
                                Insurance included
                              </span>
                            )}
                            {booking.deposit_amount && (
                              <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded-full text-xs">
                                Deposit: {formatPrice(booking.deposit_amount)} ({booking.deposit_status})
                              </span>
                            )}
                            {booking.reviews?.renter_review && (
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-yellow-600 ml-1 text-xs">{booking.reviews.renter_review.rating}/5</span>
                              </div>
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            {contactPerson?.phone && (
                              <a href={`tel:${contactPerson.phone}`} className="flex items-center hover:text-green-600">
                                <Phone className="w-4 h-4 mr-1" />
                                {contactPerson.phone}
                              </a>
                            )}
                            {/* Email contact removed - users should communicate through internal messaging */}
                          </div>
                        </div>

                        {/* Enhanced Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowDetails(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Navigate to chat with the appropriate person
                                const otherUserId = userRole === 'as_owner' ? booking.renter_id : booking.owner_id;
                                router.push(`/messages?with=${otherUserId}&booking=${booking.id}`);
                              }}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Message
                            </Button>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Status-specific actions */}
                            {booking.status === 'pending' && userRole === 'as_owner' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Decline
                                </Button>
                              </>
                            )}

                            {booking.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowReturnModal(true);
                                  }}
                                >
                                  <CheckSquare className="w-4 h-4 mr-1" />
                                  Mark Returned
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowExtendModal(true);
                                  }}
                                >
                                  <Expand className="w-4 h-4 mr-1" />
                                  Extend
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    router.push(`/bookings/${booking.id}/report-issue`);
                                  }}
                                >
                                  <Flag className="w-4 h-4 mr-1" />
                                  Report Issue
                                </Button>
                              </>
                            )}

                            {booking.status === 'completed' && !booking.reviews?.renter_review && userRole === 'as_renter' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowReviewModal(true);
                                }}
                              >
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                Leave Review
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No bookings found
            </h3>
            <p className="text-gray-500 mb-6">
              {userRole === 'as_owner' 
                ? "You don't have any bookings for your items yet."
                : "You haven't made any rental bookings yet."
              }
            </p>
            <Button onClick={() => router.push(userRole === 'as_owner' ? '/listings/create' : '/browse')}>
              {userRole === 'as_owner' ? 'List Your First Item' : 'Browse Items to Rent'}
            </Button>
          </Card>
        )}

        {/* Modals would go here - simplified for brevity */}
        {/* Details Modal, Extend Modal, Return Modal, Issue Modal, Review Modal */}
      </div>
    </AuthenticatedLayout>
  );
} 