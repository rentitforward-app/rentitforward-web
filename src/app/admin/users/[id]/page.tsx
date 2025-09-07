'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Users, 
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  Star,
  Package,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  Trash2,
  Edit,
  Eye,
  Flag,
  MessageSquare,
  CreditCard,
  MapPin,
  UserCheck,
  UserX,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import { format, isToday, isYesterday } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface UserDetails {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  verified: boolean;
  identity_verified: boolean;
  rating: number;
  total_reviews: number;
  role: string;
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  is_banned?: boolean;
  ban_reason?: string;
  ban_expires_at?: string;
  listings_count: number;
  bookings_as_renter_count: number;
  bookings_as_owner_count: number;
  total_earned: number;
  total_spent: number;
  trust_score: number;
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  listing: {
    id: string;
    title: string;
  };
}

interface UserReport {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reporter: {
    id: string;
    full_name: string;
  };
  reported_user: {
    id: string;
    full_name: string;
  };
}

interface UserListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_day: number;
  images: string[];
  approval_status: string;
  is_active: boolean;
  featured: boolean;
  created_at: string;
  views_count: number;
  bookings_count: number;
  average_rating: number;
}

interface UserBooking {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  created_at: string;
  listing: {
    id: string;
    title: string;
    images: string[];
  };
  renter?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  owner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function UserDetailsPage() {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [listings, setListings] = useState<UserListing[]>([]);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'bookings' | 'reviews' | 'reports'>('overview');
  
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const userId = params.id as string;

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      router.push('/admin');
      return;
    }
    if (userId) {
      loadUserDetails();
    }
  }, [isAdmin, adminLoading, userId, router]);

  const loadUserDetails = async () => {
    try {
      setIsLoading(true);

      // Load user basic details
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Load user statistics
      const [listingsResult, bookingsResult, reviewsResult, reportsResult] = await Promise.allSettled([
        // User's listings
        supabase
          .from('listings')
          .select(`
            id, title, description, category, price_per_day, images, 
            approval_status, is_active, featured, created_at,
            views_count, bookings_count, average_rating
          `)
          .eq('owner_id', userId)
          .order('created_at', { ascending: false }),
        
        // User's bookings
        supabase
          .from('bookings')
          .select(`
            id, status, start_date, end_date, total_amount, created_at,
            listings!inner(id, title, images),
            profiles!renter_id(id, full_name, avatar_url),
            profiles!owner_id(id, full_name, avatar_url)
          `)
          .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(20),
        
        // Reviews about this user
        supabase
          .from('reviews')
          .select(`
            id, rating, comment, created_at,
            profiles!reviewer_id(id, full_name, avatar_url),
            listings!inner(id, title)
          `)
          .eq('reviewee_id', userId)
          .order('created_at', { ascending: false }),
        
        // Reports about this user
        supabase
          .from('reports')
          .select(`
            id, type, reason, description, status, created_at,
            profiles!reporter_id(id, full_name),
            profiles!reported_user_id(id, full_name)
          `)
          .eq('reported_user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      // Process results
      const listingsData = listingsResult.status === 'fulfilled' ? listingsResult.value.data || [] : [];
      const bookingsData = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data || [] : [];
      const reviewsData = reviewsResult.status === 'fulfilled' ? reviewsResult.value.data || [] : [];
      const reportsData = reportsResult.status === 'fulfilled' ? reportsResult.value.data || [] : [];

      // Calculate additional stats
      const totalEarned = bookingsData
        .filter(b => b.owner_id === userId && b.status === 'completed')
        .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

      const totalSpent = bookingsData
        .filter(b => b.renter_id === userId && b.status === 'completed')
        .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

      const trustScore = calculateTrustScore(userData, reviewsData, reportsData);

      setUser({
        ...userData,
        listings_count: listingsData.length,
        bookings_as_renter_count: bookingsData.filter(b => b.renter_id === userId).length,
        bookings_as_owner_count: bookingsData.filter(b => b.owner_id === userId).length,
        total_earned: totalEarned,
        total_spent: totalSpent,
        trust_score: trustScore
      });

      setListings(listingsData);
      setBookings(bookingsData);
      setReviews(reviewsData);
      setReports(reportsData);

    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTrustScore = (user: any, reviews: any[], reports: any[]) => {
    let score = 50; // Base score

    // Adjust based on verification
    if (user.verified) score += 20;
    if (user.identity_verified) score += 15;

    // Adjust based on reviews
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    score += (avgRating - 3) * 5; // -10 to +10 based on rating

    // Adjust based on reports
    score -= reports.length * 5;

    // Adjust based on activity
    if (user.listings_count > 0) score += 5;
    if (user.bookings_count > 0) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const handleBanUser = async (reason: string, duration?: string) => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: reason,
          ban_expires_at: duration ? new Date(Date.now() + getDurationMs(duration)).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User banned successfully');
      loadUserDetails();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnbanUser = async () => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: false,
          ban_reason: null,
          ban_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User unbanned successfully');
      loadUserDetails();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('User deleted successfully');
      router.push('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyUser = async () => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          verified: !user?.verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User ${user?.verified ? 'unverified' : 'verified'} successfully`);
      loadUserDetails();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification');
    } finally {
      setIsUpdating(false);
    }
  };

  const getDurationMs = (duration: string) => {
    const units = { '1d': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000, '30d': 30 * 24 * 60 * 60 * 1000, 'permanent': Infinity };
    return units[duration as keyof typeof units] || 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (adminLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <Button onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/users')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-gray-600">Manage user account and activity</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={loadUserDetails}
            disabled={isLoading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/users/${userId}/edit`)}
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Edit User
          </Button>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <Users className="w-10 h-10 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
                {user.verified && <CheckCircle className="w-6 h-6 text-green-500" />}
                {user.is_banned && <Ban className="w-6 h-6 text-red-500" />}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrustScoreColor(user.trust_score)}`}>
                  Trust Score: {user.trust_score}%
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {user.email}
                </div>
                {user.phone_number && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {user.phone_number}
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleVerifyUser}
                disabled={isUpdating}
                variant={user.verified ? "outline" : "default"}
                className={user.verified ? "text-green-600 border-green-300" : ""}
              >
                {user.verified ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
                {user.verified ? 'Unverify' : 'Verify'}
              </Button>
              {user.is_banned ? (
                <Button
                  onClick={handleUnbanUser}
                  disabled={isUpdating}
                  variant="outline"
                  className="text-green-600 border-green-300"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Unban User
                </Button>
              ) : (
                <Button
                  onClick={() => handleBanUser('Policy violation', '7d')}
                  disabled={isUpdating}
                  variant="outline"
                  className="text-red-600 border-red-300"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Ban User
                </Button>
              )}
              <Button
                onClick={handleDeleteUser}
                disabled={isUpdating}
                variant="outline"
                className="text-red-600 border-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Listings</p>
                <p className="text-2xl font-bold text-gray-900">{user.listings_count}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Bookings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user.bookings_as_renter_count + user.bookings_as_owner_count}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(user.total_earned)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(user.total_spent)}</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'listings', label: 'Listings', icon: Package },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
            { id: 'reviews', label: 'Reviews', icon: Star },
            { id: 'reports', label: 'Reports', icon: Flag }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Role:</span>
                  <span className="font-medium">{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Verified:</span>
                  <span className={`font-medium ${user.verified ? 'text-green-600' : 'text-red-600'}`}>
                    {user.verified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Identity Verified:</span>
                  <span className={`font-medium ${user.identity_verified ? 'text-green-600' : 'text-red-600'}`}>
                    {user.identity_verified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${user.is_banned ? 'text-red-600' : 'text-green-600'}`}>
                    {user.is_banned ? 'Banned' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Active:</span>
                  <span className="font-medium">
                    {user.last_active_at ? format(new Date(user.last_active_at), 'MMM d, yyyy') : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Rating:</span>
                  <span className="font-medium">{user.rating}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Reviews:</span>
                  <span className="font-medium">{user.total_reviews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reports Against:</span>
                  <span className="font-medium">{reports.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Member Since:</span>
                  <span className="font-medium">{format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'listings' && (
        <Card>
          <CardHeader>
            <CardTitle>User Listings ({listings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {listings.length > 0 ? (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{listing.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{listing.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{listing.category}</span>
                          <span>{formatCurrency(listing.price_per_day * 100)}/day</span>
                          <span>{listing.views_count} views</span>
                          <span>{listing.bookings_count} bookings</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.approval_status)}`}>
                          {listing.approval_status}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/listings/${listing.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No listings found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'bookings' && (
        <Card>
          <CardHeader>
            <CardTitle>User Bookings ({bookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{booking.listing.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{formatCurrency(booking.total_amount)}</span>
                          <span>{format(new Date(booking.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No bookings found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reviews' && (
        <Card>
          <CardHeader>
            <CardTitle>Reviews About User ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{review.reviewer.full_name}</h4>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {format(new Date(review.created_at), 'MMM d, yyyy')} • {review.listing.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No reviews found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card>
          <CardHeader>
            <CardTitle>Reports About User ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Flag className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{report.reason}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Reported by {report.reporter.full_name} on {format(new Date(report.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No reports found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

