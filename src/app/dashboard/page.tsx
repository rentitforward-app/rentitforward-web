'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, 
  Package, 
  Calendar, 
  MessageCircle, 
  DollarSign, 
  Star,
  TrendingUp,
  Eye,
  Heart,
  User,
  Settings,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Edit
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface DashboardStats {
  totalListings: number;
  activeBookings: number;
  totalEarnings: number;
  averageRating: number;
  totalViews: number;
  totalFavorites: number;
}

interface Listing {
  id: string;
  title: string;
  images: string[];
  daily_rate: number;
  is_available: boolean;
  view_count: number;
  favorite_count: number;
  created_at: string;
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  created_at: string;
  listings: {
    title: string;
    images: string[];
  };
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

function DashboardContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalViews: 0,
    totalFavorites: 0,
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rentals, setRentals] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    
    // Set initial tab from URL params
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profile);
      
      // Load dashboard data
      await Promise.all([
        fetchDashboardStats(user.id),
        fetchListings(user.id),
        fetchBookings(user.id),
        fetchRentals(user.id)
      ]);
      
    } catch (error) {
      console.error('Error checking user:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async (userId: string) => {
    try {
      const [
        { data: listings },
        { data: ownedBookings },
        { data: reviews }
      ] = await Promise.all([
        supabase.from('listings').select('view_count, favorite_count').eq('owner_id', userId),
        supabase.from('bookings').select('total_amount, status').eq('owner_id', userId),
        supabase.from('reviews').select('rating').eq('reviewee_id', userId)
      ]);

      const totalViews = listings?.reduce((sum, listing) => sum + listing.view_count, 0) || 0;
      const totalFavorites = listings?.reduce((sum, listing) => sum + listing.favorite_count, 0) || 0;
      const totalEarnings = ownedBookings?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0;
      const activeBookings = ownedBookings?.filter(booking => booking.status === 'active').length || 0;
      const averageRating = reviews?.length 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      setStats({
        totalListings: listings?.length || 0,
        activeBookings,
        totalEarnings,
        averageRating,
        totalViews,
        totalFavorites,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchListings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const fetchBookings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listings:listing_id (title, images),
          profiles:renter_id (full_name, avatar_url)
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchRentals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listings:listing_id (title, images),
          profiles:owner_id (full_name, avatar_url)
        `)
        .eq('renter_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

    if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-[#44D62C]">
                Rent It Forward
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {profile?.full_name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { key: 'overview', label: 'Overview', icon: TrendingUp },
              { key: 'listings', label: 'My Listings', icon: Package },
              { key: 'bookings', label: 'Bookings', icon: Calendar },
              { key: 'rentals', label: 'My Rentals', icon: Clock },
              { key: 'profile', label: 'Profile', icon: User },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`${
                    activeTab === tab.key
                      ? 'border-[#44D62C] text-[#44D62C]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-6 w-6 text-[#44D62C]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Listings
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalListings}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-6 w-6 text-[#44D62C]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Active Bookings
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.activeBookings}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-[#44D62C]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Earnings
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {formatPrice(stats.totalEarnings)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Star className="h-6 w-6 text-[#44D62C]" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Average Rating
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/listings/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Listing
                  </Link>
                  <Link
                    href="/browse"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Browse Items
                  </Link>
                  <Link
                    href="/messages"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Messages
                  </Link>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Eye className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Total Views</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {stats.totalViews}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Heart className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Total Favorites</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {stats.totalFavorites}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Response Rate</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      95%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
              <Link
                href="/listings/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Listing
              </Link>
            </div>

            {listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="aspect-w-16 aspect-h-9 relative h-48">
                      <Image
                        src={listing.images[0] || '/placeholder-item.jpg'}
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          listing.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {listing.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{listing.title}</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-[#44D62C]">
                          {formatPrice(listing.daily_rate)}/day
                        </span>
                        <div className="flex items-center text-sm text-gray-500">
                          <Eye className="h-4 w-4 mr-1" />
                          {listing.view_count}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <Heart className="h-4 w-4 mr-1" />
                          {listing.favorite_count}
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/listings/${listing.id}`}
                            className="text-[#44D62C] hover:text-[#3AB827] text-sm font-medium"
                          >
                            View
                          </Link>
                          <Link
                            href={`/listings/${listing.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No listings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first listing.
                </p>
                <div className="mt-6">
                  <Link
                    href="/listings/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Listing
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Bookings for My Items</h2>

            {bookings.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <li key={booking.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-16">
                              <Image
                                className="h-16 w-16 rounded-lg object-cover"
                                src={booking.listings.images[0] || '/placeholder-item.jpg'}
                                alt={booking.listings.title}
                                width={64}
                                height={64}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {booking.listings.title}
                                </p>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                  {booking.status}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <p>
                                  Rented by {booking.profiles.full_name}
                                </p>
                                <span className="mx-2">•</span>
                                <p>
                                  {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="text-right mr-4">
                              <p className="text-sm font-medium text-gray-900">
                                {formatPrice(booking.total_amount)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(booking.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button className="text-[#44D62C] hover:text-[#3AB827] text-sm font-medium">
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your bookings will appear here once people start renting your items.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rentals Tab */}
        {activeTab === 'rentals' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Rentals</h2>

            {rentals.length > 0 ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {rentals.map((rental) => (
                    <li key={rental.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-16">
                              <Image
                                className="h-16 w-16 rounded-lg object-cover"
                                src={rental.listings.images[0] || '/placeholder-item.jpg'}
                                alt={rental.listings.title}
                                width={64}
                                height={64}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {rental.listings.title}
                                </p>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                                  {rental.status}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <p>
                                  From {rental.profiles.full_name}
                                </p>
                                <span className="mx-2">•</span>
                                <p>
                                  {format(new Date(rental.start_date), 'MMM d')} - {format(new Date(rental.end_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="text-right mr-4">
                              <p className="text-sm font-medium text-gray-900">
                                {formatPrice(rental.total_amount)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(rental.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button className="text-[#44D62C] hover:text-[#3AB827] text-sm font-medium">
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No rentals yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Items you rent from others will appear here.
                </p>
                <div className="mt-6">
                  <Link
                    href="/browse"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                  >
                    Browse Items
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
            
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    {profile?.avatar_url ? (
                      <Image
                        className="h-20 w-20 rounded-full"
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        width={80}
                        height={80}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{profile?.full_name}</h3>
                    <p className="text-sm text-gray-500">{profile?.email}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profile?.location}, {profile?.state}
                    </div>
                    {profile?.phone && (
                      <p className="text-sm text-gray-500 mt-1">{profile.phone}</p>
                    )}
                  </div>
                  <div>
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </button>
                  </div>
                </div>
                
                {profile?.bio && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900">Bio</h4>
                    <p className="mt-1 text-sm text-gray-700">{profile.bio}</p>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Account Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        {profile?.is_verified ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className="text-sm text-gray-700">
                          {profile?.is_verified ? 'Verified' : 'Not verified'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {profile?.stripe_onboarding_complete ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className="text-sm text-gray-700">
                          {profile?.stripe_onboarding_complete ? 'Payments enabled' : 'Payments not set up'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Member Since</h4>
                    <p className="text-sm text-gray-700">
                      {format(new Date(profile?.created_at || ''), 'MMMM yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}