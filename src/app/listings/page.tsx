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
  Clock,
  Pause,
  Play,
  Trash2,
  Settings,
  MoreVertical
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
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
  const [updatingListings, setUpdatingListings] = useState<Set<string>>(new Set());
  
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
      
      let bookingsData: Array<{listing_id: string; total_amount: number; status: string}> = [];
      let itemBookingsData: Array<any> = [];
      
      if (listingIds.length > 0) {
        // Fetch bookings for calculating earnings and stats
        const { data: bookingsRaw, error: bookingsError } = await supabase
          .from('bookings')
          .select('listing_id, total_amount, status')
          .in('listing_id', listingIds);

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
            listing_id,
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
          .in('listing_id', listingIds)
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
        const listingBookings = bookingsData.filter(booking => booking.listing_id === listing.id);
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
        listing_id: booking.listing_id,
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

  const toggleListingStatus = async (listingId: string, currentStatus: string) => {
    setUpdatingListings(prev => new Set(prev).add(listingId));
    
    try {
      const newIsActive = currentStatus !== 'active';
      
      const { error } = await supabase
        .from('listings')
        .update({ is_active: newIsActive })
        .eq('id', listingId);

      if (error) {
        console.error('Error updating listing status:', error);
        toast.error('Failed to update listing status');
        return;
      }

      // Update local state
      setListings(prev => prev.map(listing => 
        listing.id === listingId 
          ? { 
              ...listing, 
              status: newIsActive ? 'active' : 'paused' as 'active' | 'paused' | 'draft'
            }
          : listing
      ));

      toast.success(newIsActive ? 'Listing activated' : 'Listing paused');
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('Failed to update listing status');
    } finally {
      setUpdatingListings(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  const deleteListing = async (listingId: string, listingTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`)) {
      return;
    }

    setUpdatingListings(prev => new Set(prev).add(listingId));
    
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) {
        console.error('Error deleting listing:', error);
        toast.error('Failed to delete listing');
        return;
      }

      // Update local state
      setListings(prev => prev.filter(listing => listing.id !== listingId));
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setUpdatingListings(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  const editListing = (listingId: string) => {
    // For now, redirect to the create page with edit mode
    // In a full implementation, you'd create a dedicated edit page
    router.push(`/listings/create?edit=${listingId}`);
  };

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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-sm md:text-base text-gray-600">Manage your items and track bookings</p>
          </div>
          <Button
            onClick={() => router.push('/listings/create')}
            className="btn-primary flex items-center gap-2 text-sm md:text-base"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                <Package className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Total Items</p>
                <p className="text-lg md:text-xl font-bold">{listings.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Total Bookings</p>
                <p className="text-lg md:text-xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Total Earnings</p>
                <p className="text-lg md:text-xl font-bold">{formatPrice(totalEarnings)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600">Avg Rating</p>
                <p className="text-lg md:text-xl font-bold">
                  {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 md:space-x-8 overflow-x-auto">
            {[
              { key: 'items', label: 'My Items', count: listings.length },
              { key: 'bookings', label: 'Item Bookings', count: itemBookings.length },
              { key: 'earnings', label: 'Earnings' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-xs md:text-sm flex-shrink-0 ${
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
              <div className="text-center py-8 md:py-12">
                <Package className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400 mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No items listed yet</h3>
                <p className="text-gray-500 mb-4 md:mb-6 text-sm md:text-base">Start earning by listing your first item!</p>
                <Button
                  onClick={() => router.push('/listings/create')}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  List Your First Item
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {listings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                  <div className="relative h-40 md:h-48">
                    <Image
                      src={listing.images?.[0] || '/images/placeholder-item.jpg'}
                      alt={listing.title}
                      fill
                      className="object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(listing.status)}`}>
                      {getStatusIcon(listing.status)}
                      {listing.status}
                    </div>
                  </div>
                  <div className="p-3 md:p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base line-clamp-1">{listing.title}</h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base md:text-lg font-bold text-green-600">{formatPrice(listing.daily_rate)}/day</span>
                      <span className="text-xs md:text-sm text-gray-500 truncate">{listing.category}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3 md:mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span className="truncate">{listing.view_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">{listing.total_bookings}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="truncate text-xs">{formatPrice(listing.total_earnings)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 md:gap-2 mb-2">
                      <Button
                        onClick={() => router.push(`/listings/${listing.id}`)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs md:text-sm"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => editListing(listing.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs md:text-sm"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    
                    <div className="flex gap-1 md:gap-2">
                      <Button
                        onClick={() => toggleListingStatus(listing.id, listing.status)}
                        disabled={updatingListings.has(listing.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs md:text-sm"
                      >
                        {listing.status === 'active' ? (
                          <>
                            <Pause className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Activate</span>
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => deleteListing(listing.id, listing.title)}
                        disabled={updatingListings.has(listing.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-700 hover:border-red-300 text-xs md:text-sm"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
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
          <div className="space-y-3 md:space-y-4">
            {itemBookings.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Calendar className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400 mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-500 mb-4 md:mb-6 text-sm md:text-base">Bookings for your items will appear here.</p>
              </div>
            ) : (
              itemBookings.map((booking) => (
                <Card key={booking.id} className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">{booking.listing_title}</h3>
                      <p className="text-xs md:text-sm text-gray-600">
                        {format(new Date(booking.start_date), 'MMM dd')} - {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 flex-shrink-0 ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      {booking.status}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                        <span className="text-xs md:text-sm font-medium truncate">{booking.renter.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                        <span className="text-xs md:text-sm font-medium">{formatPrice(booking.total_amount)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button
                        onClick={() => window.open(`mailto:${booking.renter.email}`)}
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm"
                      >
                        <Mail className="w-3 h-3" />
                        <span className="hidden sm:inline ml-1">Email</span>
                      </Button>
                      {booking.renter.phone && (
                        <Button
                          onClick={() => window.open(`tel:${booking.renter.phone}`)}
                          variant="outline"
                          size="sm"
                          className="text-xs md:text-sm"
                        >
                          <Phone className="w-3 h-3" />
                          <span className="hidden sm:inline ml-1">Phone</span>
                        </Button>
                      )}
                      <Button
                        onClick={() => router.push(`/messages?user=${booking.renter.id}`)}
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span className="hidden sm:inline ml-1">Message</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600">Total Earnings</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{formatPrice(totalEarnings)}</p>
                    <p className="text-xs md:text-sm text-green-600">+12% from last month</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600">This Month</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{formatPrice(450)}</p>
                    <p className="text-xs md:text-sm text-blue-600">3 completed rentals</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 md:p-3 bg-purple-100 rounded-lg">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-600">Avg per Booking</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{formatPrice(totalEarnings / totalBookings)}</p>
                    <p className="text-xs md:text-sm text-purple-600">Across {totalBookings} bookings</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Top Performing Items</h3>
              <div className="space-y-3 md:space-y-4">
                {listings
                  .sort((a, b) => b.total_earnings - a.total_earnings)
                  .slice(0, 3)
                  .map((listing, index) => (
                    <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm md:text-base truncate">{listing.title}</p>
                          <p className="text-xs md:text-sm text-gray-600">{listing.total_bookings} bookings</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-900 text-sm md:text-base">{formatPrice(listing.total_earnings)}</p>
                        <p className="text-xs md:text-sm text-gray-600">{formatPrice(listing.daily_rate)}/day</p>
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