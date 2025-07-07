'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Plus, 
  Eye, 
  Edit, 
  Calendar, 
  DollarSign, 
  Package, 
  TrendingUp,
  Users,
  Star,
  MessageCircle,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Listing {
  id: string;
  title: string;
  description: string;
  daily_rate: number;
  category: string;
  images: string[];
  status: 'active' | 'paused' | 'draft';
  created_at: string;
  view_count: number;
  total_bookings: number;
  total_earnings: number;
  availability: boolean;
  rating: number;
  review_count: number;
}

interface ItemBooking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  listing_id: string;
  listing_title: string;
  renter: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
    phone?: string;
  };
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [itemBookings, setItemBookings] = useState<ItemBooking[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'bookings' | 'earnings'>('items');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Fetch real listings for the current user
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          price_per_day,
          category,
          images,
          is_active,
          approval_status,
          created_at,
          view_count,
          booking_count,
          available_from,
          available_to,
          rating,
          review_count
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
        return;
      }

      // Fetch bookings for the user's listings to calculate earnings
      const listingIds = listingsData?.map(listing => listing.id) || [];
      
      let bookingsData: Array<{item_id: string; total_amount: number; status: string}> = [];
      let itemBookingsData: Array<any> = [];
      
      if (listingIds.length > 0) {
        // Fetch bookings for calculating earnings and stats
        const { data: bookingsRaw, error: bookingsError } = await supabase
          .from('bookings')
          .select('item_id, total_amount, status')
          .in('item_id', listingIds);

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        } else {
          bookingsData = bookingsRaw || [];
        }

        // Fetch detailed bookings with renter info for the bookings tab
        const { data: itemBookingsRaw, error: itemBookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            start_date,
            end_date,
            total_amount,
            status,
            created_at,
            item_id,
            listings!inner(
              id,
              title
            ),
            profiles!bookings_renter_id_fkey(
              id,
              full_name,
              avatar_url,
              email,
              phone_number
            )
          `)
          .in('item_id', listingIds)
          .order('created_at', { ascending: false });

        if (itemBookingsError) {
          console.error('Error fetching item bookings:', itemBookingsError);
        } else {
          itemBookingsData = itemBookingsRaw || [];
        }
      }

      // Transform listings data to match the interface
      const transformedListings: Listing[] = (listingsData || []).map(listing => {
        // Calculate stats for this listing
        const listingBookings = bookingsData.filter(booking => booking.item_id === listing.id);
        const completedBookings = listingBookings.filter(booking => booking.status === 'completed');
        const totalEarnings = completedBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);

        // Determine status based on is_active and approval_status
        let status: 'active' | 'paused' | 'draft';
        if (listing.approval_status === 'pending' || listing.approval_status === 'rejected') {
          status = 'draft';
        } else if (listing.is_active) {
          status = 'active';
        } else {
          status = 'paused';
        }

        // Determine availability
        const now = new Date();
        const availableFrom = listing.available_from ? new Date(listing.available_from) : null;
        const availableTo = listing.available_to ? new Date(listing.available_to) : null;
        const availability = (!availableFrom || availableFrom <= now) && (!availableTo || availableTo >= now);

        return {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          daily_rate: Number(listing.price_per_day),
          category: listing.category,
          images: listing.images || [],
          status,
          created_at: listing.created_at,
          view_count: listing.view_count || 0,
          total_bookings: listing.booking_count || 0,
          total_earnings: totalEarnings,
          availability,
          rating: Number(listing.rating) || 0,
          review_count: listing.review_count || 0
        };
      });

      // Transform bookings data to match the interface
      const transformedBookings: ItemBooking[] = (itemBookingsData || []).map(booking => ({
        id: booking.id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: Number(booking.total_amount),
        status: booking.status as any, // Cast to match our enum
        created_at: booking.created_at,
        listing_id: booking.item_id,
        listing_title: booking.listings?.title || 'Unknown Item',
        renter: {
          id: booking.profiles?.id || '',
          full_name: booking.profiles?.full_name || 'Unknown User',
          avatar_url: booking.profiles?.avatar_url,
          email: booking.profiles?.email || '',
          phone: booking.profiles?.phone_number
        }
      }));

      setListings(transformedListings);
      setItemBookings(transformedBookings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'paused':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(price);
  };

  const totalEarnings = listings.reduce((sum, listing) => sum + listing.total_earnings, 0);
  const totalBookings = listings.reduce((sum, listing) => sum + listing.total_bookings, 0);
  
  // Calculate average rating - only include listings that have ratings
  const ratingsWithReviews = listings.filter(listing => listing.review_count > 0);
  const averageRating = ratingsWithReviews.length > 0 
    ? ratingsWithReviews.reduce((sum, listing) => sum + listing.rating, 0) / ratingsWithReviews.length
    : 0;

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-600">Manage your items and track bookings</p>
          </div>
          <Button
            onClick={() => router.push('/listings/create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-xl font-bold">{listings.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-xl font-bold">{formatPrice(totalEarnings)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-xl font-bold">
                  {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'items', label: 'My Items', count: listings.length },
              { key: 'bookings', label: 'Item Bookings', count: itemBookings.length },
              { key: 'earnings', label: 'Earnings' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items listed yet</h3>
                <p className="text-gray-500 mb-6">Start earning by listing your first item!</p>
                <Button
                  onClick={() => router.push('/listings/create')}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  List Your First Item
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                  <div className="relative h-48">
                    <Image
                      src={listing.images[0]}
                      alt={listing.title}
                      fill
                      className="object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(listing.status)}`}>
                      {getStatusIcon(listing.status)}
                      {listing.status}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-green-600">{formatPrice(listing.daily_rate)}/day</span>
                      <span className="text-sm text-gray-500">{listing.category}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {listing.view_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {listing.total_bookings}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatPrice(listing.total_earnings)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => router.push(`/listings/${listing.id}`)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => router.push(`/listings/${listing.id}/edit`)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {itemBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-500 mb-6">Bookings for your items will appear here.</p>
              </div>
            ) : (
              itemBookings.map((booking) => (
                <Card key={booking.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{booking.listing_title}</h3>
                      <p className="text-sm text-gray-600">
                        {format(new Date(booking.start_date), 'MMM dd')} - {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      {booking.status}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{booking.renter.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{formatPrice(booking.total_amount)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => window.open(`mailto:${booking.renter.email}`)}
                        variant="outline"
                        size="sm"
                      >
                        <Mail className="w-3 h-3" />
                      </Button>
                      {booking.renter.phone && (
                        <Button
                          onClick={() => window.open(`tel:${booking.renter.phone}`)}
                          variant="outline"
                          size="sm"
                        >
                          <Phone className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        onClick={() => router.push(`/messages?user=${booking.renter.id}`)}
                        variant="outline"
                        size="sm"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarnings)}</p>
                    <p className="text-sm text-green-600">+12% from last month</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(450)}</p>
                    <p className="text-sm text-blue-600">3 completed rentals</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg per Booking</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarnings / totalBookings)}</p>
                    <p className="text-sm text-purple-600">Across {totalBookings} bookings</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Items</h3>
              <div className="space-y-4">
                {listings
                  .sort((a, b) => b.total_earnings - a.total_earnings)
                  .slice(0, 3)
                  .map((listing, index) => (
                    <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{listing.title}</p>
                          <p className="text-sm text-gray-600">{listing.total_bookings} bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPrice(listing.total_earnings)}</p>
                        <p className="text-sm text-gray-600">{formatPrice(listing.daily_rate)}/day</p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 