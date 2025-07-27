'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  MapPin, 
  Star, 
  Calendar, 
  MessageCircle, 
  Shield, 
  Truck, 
  Package,
  User,
  Clock,
  DollarSign,
  Info,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  Edit,
  FileText,
  TrendingUp,
  Activity,
  CreditCard,
  Flag,
  Users,
  Mail,
  Phone,
  Download
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useAdmin } from '@/hooks/use-admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AdminListingDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  price_per_day: number;
  price_weekly: number | null;
  price_hourly: number | null;
  deposit: number;
  images: string[];
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  condition: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  features: string[];
  rules: string[];
  view_count: number;
  favorite_count: number;
  rating?: number | null;
  review_count?: number | null;
  delivery_available: boolean;
  pickup_available: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string | null;
    avatar_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    verified: boolean;
    identity_verified: boolean;
    rating: number;
    total_reviews: number;
    created_at: string;
    role: string;
  };
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  renter_profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  owner_profile: {
    full_name: string;
    email: string;
  };
}

interface Report {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reporter_profile: {
    full_name: string;
    email: string;
  };
}

export default function AdminListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  const [listing, setListing] = useState<AdminListingDetail | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'reports' | 'financials'>('overview');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    if (listingId) {
      fetchListingDetails();
      fetchBookings();
      fetchReports();
    }
  }, [listingId, isAdmin, adminLoading]);

  const fetchListingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles!owner_id (
            id,
            full_name,
            email,
            phone_number,
            avatar_url,
            address,
            city,
            state,
            postal_code,
            verified,
            identity_verified,
            rating,
            total_reviews,
            created_at,
            role
          )
        `)
        .eq('id', listingId)
        .single();

      if (error) throw error;
      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to fetch listing details');
    }
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_date,
          end_date,
          total_amount,
          deposit_amount,
          status,
          created_at,
          renter_profile:profiles!renter_id (
            full_name,
            email,
            avatar_url
          ),
          owner_profile:profiles!owner_id (
            full_name,
            email
          )
        `)
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to handle the profile relationships correctly
      const formattedBookings = (data || []).map(booking => ({
        ...booking,
        renter_profile: Array.isArray(booking.renter_profile) ? booking.renter_profile[0] : booking.renter_profile,
        owner_profile: Array.isArray(booking.owner_profile) ? booking.owner_profile[0] : booking.owner_profile,
      })) as Booking[];
      
      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchReports = async () => {
    try {
      // Reports table doesn't exist yet, so we'll use a placeholder for now
      // In the future, this would query an actual reports table
      setReports([]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationToOwner = async (type: 'approved' | 'rejected', reason?: string) => {
    try {
      if (!listing?.profiles?.id) {
        console.log('No listing owner ID found for notification');
        return;
      }

      // For now, let's skip notifications due to permission issues and just log success
      console.log('Would send notification:', {
        type,
        listingTitle: listing.title,
        ownerId: listing.profiles.id,
        reason
      });
      
      return;

      // TODO: Fix notification permissions and re-enable this code
      /*
      const notificationData = {
        user_id: listing.profiles.id,
        title: type === 'approved' ? 'Listing Approved!' : 'Listing Rejected',
        message: type === 'approved' 
          ? `Your listing "${listing.title}" has been approved and is now live on the platform.`
          : `Your listing "${listing.title}" has been rejected. Reason: ${reason || 'No reason provided.'}`,
        type: 'listing',
        related_id: listingId,
        is_read: false
      };

      console.log('Attempting to send notification with data:', JSON.stringify(notificationData, null, 2));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select();

      if (error) {
        console.error('Full Supabase notification error object:', error);
        console.error('Error type:', typeof error);
        console.error('Error properties:', Object.keys(error));
        console.error('Stringified error:', JSON.stringify(error, null, 2));
        console.error('Failed notification data:', JSON.stringify(notificationData, null, 2));
      } else {
        console.log('Notification sent to owner successfully:', data);
      }
      */
    } catch (error) {
      console.error('Unexpected error sending notification:', error);
    }
  };

  const handleApproval = async (action: 'approve' | 'reject', reason?: string) => {
    try {
      console.log(`Attempting to ${action} listing:`, listingId);
      console.log('Current user:', user?.id, user?.email);
      console.log('Admin status:', isAdmin);
      
      // Check Supabase session for authentication
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', sessionData?.session?.user?.id, sessionData?.session?.user?.email);
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Authentication error. Please refresh and try again.');
        return;
      }
      
      // Validate authentication
      if (!user?.id || !sessionData?.session?.user?.id) {
        toast.error('Authentication required. Please refresh the page and try again.');
        return;
      }

      const updateData: any = {
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };

      if (action === 'approve') {
        updateData.rejection_reason = null; // Clear any previous rejection reason
      } else if (reason) {
        updateData.rejection_reason = reason;
      }

      console.log('Update data:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId)
        .select();

      if (error) {
        console.error('Full Supabase update error object:', error);
        console.error('Error type:', typeof error);
        console.error('Error properties:', Object.keys(error));
        console.error('Stringified error:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Updated listing successfully:', data);

      // Send notification to owner (simplified for now due to permission issues)
      console.log(`Would send ${action} notification to owner`);
      
      toast.success(`Listing ${action}d successfully`);
      fetchListingDetails();
    } catch (error) {
      console.error(`Full error object when ${action}ing listing:`, error);
      console.error('Error type:', typeof error);
      console.error('Error properties:', error ? Object.keys(error) : 'null');
      console.error('Stringified error:', JSON.stringify(error, null, 2));
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Extracted error message:', errorMessage);
      
      toast.error(`Failed to ${action} listing: ${errorMessage}`);
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectReason.trim()) {
      handleApproval('reject', rejectReason.trim());
      setShowRejectModal(false);
      setRejectReason('');
    } else {
      toast.error('Please provide a reason for rejection');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Confirmed</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Found</h1>
          <p className="text-gray-600 mb-4">The listing you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const totalRevenue = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.total_amount, 0);

  const bookingStats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Listings
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
            <p className="text-gray-600">Admin Listing Details</p>
          </div>
        </div>
        <div></div>
      </div>

      {/* Status and Quick Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-sm text-gray-500">Status:</span>
              {getStatusBadge(listing.approval_status)}
            </div>
            <div>
              <span className="text-sm text-gray-500">Active:</span>
              <span className={`ml-2 ${listing.is_active ? 'text-green-600' : 'text-red-600'}`}>
                {listing.is_active ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created:</span>
              <span className="ml-2 text-gray-900">
                {format(new Date(listing.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {listing.approval_status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApproval('approve')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {listing.approval_status === 'approved' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Ban className="w-4 h-4 mr-1" />
                Disable
              </Button>
            )}
            {listing.approval_status === 'rejected' && (
              <Button
                size="sm"
                onClick={() => handleApproval('approve')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Re-approve
              </Button>
            )}
            <Button size="sm" variant="outline">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
        </div>

        {listing.rejection_reason && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">Rejection Reason</h4>
                <p className="text-sm text-red-700">{listing.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Views</p>
              <p className="text-2xl font-bold text-gray-900">{listing.view_count}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{bookingStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Flag className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
            { id: 'reports', label: 'Reports', icon: Flag },
            { id: 'financials', label: 'Financials', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Listing Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Listing Details</h3>
            
            {/* Images */}
            {listing.images && listing.images.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {listing.images.slice(0, 4).map((image, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={image}
                        alt={`${listing.title} - Image ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                {listing.images.length > 4 && (
                  <p className="text-sm text-gray-500 mt-2">
                    +{listing.images.length - 4} more images
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Category:</span>
                <span className="ml-2 text-gray-900">{listing.category}</span>
                {listing.subcategory && (
                  <span className="ml-1 text-gray-600">/ {listing.subcategory}</span>
                )}
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Price:</span>
                <span className="ml-2 text-lg font-semibold text-green-600">
                  {formatCurrency(listing.price_per_day)}/day
                </span>
              </div>

              {listing.deposit > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Deposit:</span>
                  <span className="ml-2 text-gray-900">{formatCurrency(listing.deposit)}</span>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-500">Condition:</span>
                <span className="ml-2 text-gray-900">{listing.condition}</span>
              </div>

              {listing.brand && (
                <div>
                  <span className="text-sm text-gray-500">Brand:</span>
                  <span className="ml-2 text-gray-900">{listing.brand}</span>
                </div>
              )}

              {listing.model && (
                <div>
                  <span className="text-sm text-gray-500">Model:</span>
                  <span className="ml-2 text-gray-900">{listing.model}</span>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-500">Location:</span>
                <span className="ml-2 text-gray-900">
                  {listing.city}, {listing.state} {listing.postal_code}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500">Delivery:</span>
                <span className="ml-2 text-gray-900">
                  {listing.delivery_available ? 'Available' : 'Not Available'}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500">Pickup:</span>
                <span className="ml-2 text-gray-900">
                  {listing.pickup_available ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-sm text-gray-500">Description:</span>
              <p className="mt-1 text-gray-900">{listing.description}</p>
            </div>

            {listing.features && listing.features.length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-gray-500">Features:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {listing.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {listing.rules && listing.rules.length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-gray-500">Rules:</span>
                <ul className="mt-2 space-y-1">
                  {listing.rules.map((rule, index) => (
                    <li key={index} className="text-sm text-gray-700">• {rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Owner Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner Information</h3>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                {listing.profiles.avatar_url ? (
                  <Image
                    src={listing.profiles.avatar_url}
                    alt={listing.profiles.full_name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900 flex items-center">
                  {listing.profiles.full_name}
                  {listing.profiles.verified && (
                    <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
                  )}
                </h4>
                <p className="text-gray-600">{listing.profiles.email}</p>
                {listing.profiles.phone_number && (
                  <p className="text-gray-500">{listing.profiles.phone_number}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Role:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  listing.profiles.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {listing.profiles.role}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500">Member Since:</span>
                <span className="ml-2 text-gray-900">
                  {format(new Date(listing.profiles.created_at), 'MMM d, yyyy')}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500">Verified:</span>
                <span className="ml-2 text-gray-900">
                  {listing.profiles.verified ? 'Yes' : 'No'}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500">Identity Verified:</span>
                <span className="ml-2 text-gray-900">
                  {listing.profiles.identity_verified ? 'Yes' : 'No'}
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500">Rating:</span>
                <span className="ml-2 text-gray-900 flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  {listing.profiles.rating}/5 ({listing.profiles.total_reviews} reviews)
                </span>
              </div>

              {listing.profiles.address && (
                <div>
                  <span className="text-sm text-gray-500">Address:</span>
                  <span className="ml-2 text-gray-900">
                    {listing.profiles.address}, {listing.profiles.city}, {listing.profiles.state}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex space-x-2">
              <Button size="sm" variant="outline">
                <Mail className="w-4 h-4 mr-1" />
                Email Owner
              </Button>
              <Button size="sm" variant="outline">
                <Users className="w-4 h-4 mr-1" />
                View Profile
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'bookings' && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
            <div className="mt-2 flex space-x-4 text-sm text-gray-600">
              <span>Total: {bookingStats.total}</span>
              <span>Confirmed: {bookingStats.confirmed}</span>
              <span>Completed: {bookingStats.completed}</span>
              <span>Cancelled: {bookingStats.cancelled}</span>
            </div>
          </div>
          
          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No bookings yet</h3>
              <p className="text-sm text-gray-500">This listing hasn't been booked.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            {booking.renter_profile.avatar_url ? (
                              <Image
                                src={booking.renter_profile.avatar_url}
                                alt={booking.renter_profile.full_name}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {booking.renter_profile.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.renter_profile.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(booking.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getBookingStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(booking.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Reports & Flags</h3>
            <p className="text-sm text-gray-600 mt-1">
              User reports and admin flags for this listing
            </p>
          </div>
          
          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <Flag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No reports</h3>
              <p className="text-sm text-gray-500">This listing has no reports or flags.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reports.map((report) => (
                <div key={report.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          {report.type}
                        </span>
                        <span className="text-sm text-gray-500">
                          by {report.reporter_profile.full_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(report.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900">{report.reason}</h4>
                      <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                    </div>
                    <div className="ml-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        report.status === 'resolved' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'financials' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (3%):</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue * 0.03)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Owner Earnings:</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalRevenue * 0.97)}</span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. per Booking:</span>
                <span className="font-semibold text-gray-900">
                  {bookingStats.completed > 0 ? formatCurrency(totalRevenue / bookingStats.completed) : '$0'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Conversion Rate:</span>
                <span className="font-semibold text-gray-900">
                  {listing.view_count > 0 ? Math.round((bookingStats.total / listing.view_count) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Booking Rate:</span>
                <span className="font-semibold text-gray-900">
                  {bookingStats.total > 0 ? Math.round((bookingStats.confirmed / bookingStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completion Rate:</span>
                <span className="font-semibold text-gray-900">
                  {bookingStats.total > 0 ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cancellation Rate:</span>
                <span className="font-semibold text-red-600">
                  {bookingStats.total > 0 ? Math.round((bookingStats.cancelled / bookingStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowRejectModal(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reject Listing</h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Please provide a reason for rejecting this listing. The owner will be notified with this reason.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmReject}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject Listing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 