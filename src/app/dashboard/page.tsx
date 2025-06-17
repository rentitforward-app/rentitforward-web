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
  Edit,
  Shield,
  Award,
  BarChart3,
  Activity
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface DashboardStats {
  totalListings: number;
  activeBookings: number;
  totalEarnings: number;
  averageRating: number;
  totalViews: number;
  totalFavorites: number;
  trustScore: number;
  completionRate: number;
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
  category: string;
  state: string;
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
    trustScore: 85,
    completionRate: 92
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

      // Calculate trust score based on various factors
      const completedBookings = ownedBookings?.filter(booking => booking.status === 'completed').length || 0;
      const totalBookings = ownedBookings?.length || 0;
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 100;
      
      // Trust score algorithm (simplified)
      const trustScore = Math.min(100, Math.round(
        (averageRating / 5) * 40 +  // 40% from rating
        (completionRate / 100) * 30 + // 30% from completion
        Math.min(30, (listings?.length || 0) * 5) // 30% from activity
      ));

      setStats({
        totalListings: listings?.length || 0,
        activeBookings,
        totalEarnings,
        averageRating,
        totalViews,
        totalFavorites,
        trustScore,
        completionRate
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

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-gray-600">Manage your rentals and track your progress</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/messages')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages
            </Button>
            <Button
              onClick={() => router.push('/listings/create')}
            >
              <Plus className="w-4 h-4 mr-2" />
              List Item
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
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
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Listings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeBookings}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalEarnings)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Trust Score & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trust Score Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Trust Score</h3>
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                
                <div className="text-center mb-4">
                  <div className={`text-4xl font-bold ${getTrustScoreColor(stats.trustScore)}`}>
                    {stats.trustScore}
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTrustScoreBadge(stats.trustScore).color}`}>
                      {getTrustScoreBadge(stats.trustScore).text}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Completion Rate</span>
                    <span className="font-medium">{stats.completionRate.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rating Average</span>
                    <span className="font-medium">
                      {stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)}/5.0` : 'No ratings yet'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(stats.averageRating / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </Card>

              {/* Activity Summary */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Activity Summary</h3>
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Eye className="h-5 w-5 text-gray-500 mr-3" />
                      <span className="text-sm text-gray-700">Total Views</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{stats.totalViews}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Heart className="h-5 w-5 text-red-500 mr-3" />
                      <span className="text-sm text-gray-700">Total Favorites</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{stats.totalFavorites}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-blue-500 mr-3" />
                      <span className="text-sm text-gray-700">Total Bookings</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{bookings.length + rentals.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Award className="h-5 w-5 text-yellow-500 mr-3" />
                      <span className="text-sm text-gray-700">Member Since</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {format(new Date(profile?.created_at || ''), 'MMM yyyy')}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => router.push('/listings/create')}
                >
                  <Plus className="h-6 w-6 mb-2" />
                  List New Item
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => router.push('/browse')}
                >
                  <Package className="h-6 w-6 mb-2" />
                  Browse Items
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => router.push('/messages')}
                >
                  <MessageCircle className="h-6 w-6 mb-2" />
                  View Messages
                </Button>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              {(bookings.length > 0 || rentals.length > 0) ? (
                <div className="space-y-4">
                  {[...bookings.slice(0, 3), ...rentals.slice(0, 2)].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                          <Calendar className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.listings?.title || 'Booking'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                  <p className="text-gray-500 mb-4">Start listing items or making bookings to see activity here</p>
                  <Button onClick={() => router.push('/listings/create')}>
                    Create Your First Listing
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Other tabs remain the same for now... */}
        {activeTab !== 'overview' && (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View
            </h3>
            <p className="text-gray-500 mb-4">Enhanced {activeTab} interface coming in the next update</p>
            <Button variant="outline">
              Switch to Overview
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}