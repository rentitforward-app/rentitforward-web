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
  Mail,
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
  Star
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  pickup_instructions?: string;
  return_instructions?: string;
  insurance_selected: boolean;
  deposit_amount?: number;
  deposit_status?: 'held' | 'released' | 'returned';
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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'as_owner' | 'as_renter'>('as_owner');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  useEffect(() => {
    filterBookings();
  }, [bookings, statusFilter, searchTerm]);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Mock data for demonstration since Supabase isn't fully set up
      const mockBookings: Booking[] = [
        {
          id: '1',
          start_date: '2024-12-15',
          end_date: '2024-12-20',
          total_amount: 250,
          status: 'confirmed',
          created_at: '2024-11-20T10:00:00Z',
          insurance_selected: true,
          deposit_amount: 100,
          listing: {
            id: '1',
            title: 'Professional DSLR Camera Kit',
            images: ['/api/placeholder/300/300'],
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
          listing: {
            id: '2',
            title: 'Mountain Bike - Trek X-Caliber',
            images: ['/api/placeholder/300/300'],
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

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activeTab === 'as_owner' ? booking.renter?.full_name : booking.owner?.full_name)
          ?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
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
        return <RefreshCw className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Management</h1>
            <p className="text-gray-600">Manage all your bookings and rentals</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={() => router.push('/browse')}>
              Browse Items
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md">
            <button
              onClick={() => setActiveTab('as_owner')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'as_owner'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="h-4 w-4 mr-2" />
              My Items
            </button>
            <button
              onClick={() => setActiveTab('as_renter')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'as_renter'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              My Rentals
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={loadBookings}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const contactPerson = activeTab === 'as_owner' ? booking.renter : booking.owner;

              return (
                <Card key={booking.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex space-x-4 flex-1">
                      {/* Item Image */}
                      <div className="w-20 h-20 flex-shrink-0">
                        <Image
                          src={booking.listing.images[0] || '/api/placeholder/300/300'}
                          alt={booking.listing.title}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Booking Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {booking.listing.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {activeTab === 'as_owner' ? 'Rented to' : 'Rented from'}: {contactPerson?.full_name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              <span className="ml-1">{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                            </span>
                          </div>
                        </div>

                        {/* Dates and Duration */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {booking.insurance_selected && (
                              <span className="text-blue-600">Insurance included</span>
                            )}
                          </div>

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
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push('/messages')}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Message
                            </Button>
                            {booking.status === 'pending' && activeTab === 'as_owner' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                >
                                  Decline
                                </Button>
                              </>
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
              {activeTab === 'as_owner' 
                ? "You don't have any bookings for your items yet."
                : "You haven't made any rental bookings yet."
              }
            </p>
            <Button onClick={() => router.push(activeTab === 'as_owner' ? '/listings/create' : '/browse')}>
              {activeTab === 'as_owner' ? 'List Your First Item' : 'Browse Items to Rent'}
            </Button>
          </Card>
        )}

        {/* Booking Details Modal */}
        {showDetails && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Item Info */}
                  <div className="flex space-x-4">
                    <Image
                      src={selectedBooking.listing.images[0] || '/api/placeholder/300/300'}
                      alt={selectedBooking.listing.title}
                      width={120}
                      height={120}
                      className="rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {selectedBooking.listing.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        Category: {selectedBooking.listing.category}
                      </p>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-4 h-4 fill-current text-yellow-400" />
                        ))}
                        <span className="text-sm text-gray-500 ml-2">(4.8)</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Person */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      {activeTab === 'as_owner' ? 'Renter' : 'Owner'} Contact
                    </h4>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {(activeTab === 'as_owner' ? selectedBooking.renter : selectedBooking.owner)?.full_name}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {(activeTab === 'as_owner' ? selectedBooking.renter : selectedBooking.owner)?.email}
                          </div>
                          {(activeTab === 'as_owner' ? selectedBooking.renter : selectedBooking.owner)?.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {(activeTab === 'as_owner' ? selectedBooking.renter : selectedBooking.owner)?.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Daily rate:</span>
                        <span>{formatPrice(selectedBooking.listing.daily_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total rental:</span>
                        <span>{formatPrice(selectedBooking.total_amount)}</span>
                      </div>
                      {selectedBooking.insurance_selected && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Insurance:</span>
                          <span className="text-green-600">Included</span>
                        </div>
                      )}
                      {selectedBooking.deposit_amount && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Security deposit:</span>
                          <span>{formatPrice(selectedBooking.deposit_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button
                      onClick={() => router.push('/messages')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 