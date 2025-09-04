'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';
import { 
  Users, 
  Package, 
  Calendar, 
  DollarSign, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  MessageSquare,
  Shield,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Eye,
  Heart,
  Flag,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Bell,
  UserCheck,
  UserX,
  FileText,
  CreditCard,
  MapPin,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  AlertCircle,
  CheckSquare,
  X
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { format, subDays, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  usersThisWeek: number;
  usersLastWeek: number;
  verifiedUsers: number;
  activeUsers: number;
  totalListings: number;
  pendingListings: number;
  approvedListings: number;
  activeListings: number;
  rejectedListings: number;
  featuredListings: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  platformFees: number;
  averageBookingValue: number;
}

interface PendingListing {
  id: string;
  title: string;
  description: string;
  price_per_day: number;
  category: string;
  images: string[];
  created_at: string;
  owner: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    verified: boolean;
  };
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'listing_created' | 'booking_made' | 'payment_completed' | 'review_posted' | 'report_filed';
  description: string;
  user_name: string;
  user_avatar?: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  metadata?: any;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  action_required: boolean;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    usersThisWeek: 0,
    usersLastWeek: 0,
    verifiedUsers: 0,
    activeUsers: 0,
    totalListings: 0,
    pendingListings: 0,
    approvedListings: 0,
    activeListings: 0,
    rejectedListings: 0,
    featuredListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    platformFees: 0,
    averageBookingValue: 0,
  });
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [escrowSummary, setEscrowSummary] = useState({
    totalEscrowAmount: 0,
    pendingReleases: 0,
    completedReleases: 0,
    failedReleases: 0
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('7d');
  
  const router = useRouter();
  const supabase = createClient();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    // Don't load data while admin status is being checked
    if (adminLoading) return;
    
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    
    loadDashboardData();
  }, [isAdmin, adminLoading, router]);

  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      // Parallel data fetching for better performance
      const [
        usersResult,
        listingsResult,
        bookingsResult,
        paymentsResult,
        pendingPaymentsResult,
        pendingListingsResult,
        activityResult
      ] = await Promise.allSettled([
        // Users data with more details
        supabase
          .from('profiles')
          .select('id, created_at, verified, last_active_at, role'),
        
        // Listings data with more details
        supabase
          .from('listings')
          .select('id, approval_status, is_active, featured, created_at, category, price_per_day'),
        
        // Bookings data with amounts
        supabase
          .from('bookings')
          .select('id, status, total_amount, created_at'),
        
        // Payments data
        supabase
          .from('payments')
          .select('id, amount, status, platform_fee, created_at'),
        
        // Pending payments for release
        supabase
          .from('payments')
          .select(`
            *,
            bookings!inner(
              id,
              start_date,
              end_date,
              status,
              listings!inner(
                id,
                title,
                profiles!inner(
                  id,
                  full_name,
                  email
                )
              ),
              profiles!inner(
                id,
                full_name,
                email
              )
            )
          `)
          .eq('status', 'held_in_escrow')
          .order('created_at', { ascending: false })
          .limit(20),
        
        // Pending listings for approval queue
        supabase
          .from('listings')
          .select(`
            id, title, description, price_per_day, category, images, created_at,
            profiles!owner_id (
              id, full_name, email, avatar_url, verified
            )
          `)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Recent activity - simulate with recent data
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, created_at')
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      // Process users data
      const usersData = usersResult.status === 'fulfilled' ? usersResult.value.data || [] : [];
      const currentDate = new Date();
      const weekAgo = subDays(currentDate, 7);
      const twoWeeksAgo = subDays(currentDate, 14);
      const monthAgo = subDays(currentDate, 30);

      const totalUsers = usersData.length;
      const usersThisWeek = usersData.filter(user => 
        new Date(user.created_at) >= weekAgo
      ).length;
      const usersLastWeek = usersData.filter(user => {
        const createdAt = new Date(user.created_at);
        return createdAt >= twoWeeksAgo && createdAt < weekAgo;
      }).length;
      const verifiedUsers = usersData.filter(user => user.verified).length;
      const activeUsers = usersData.filter(user => 
        user.last_active_at && new Date(user.last_active_at) >= monthAgo
      ).length;

      // Process listings data
      const listingsData = listingsResult.status === 'fulfilled' ? listingsResult.value.data || [] : [];
      const totalListings = listingsData.length;
      const pendingListingsCount = listingsData.filter(l => l.approval_status === 'pending').length;
      const approvedListings = listingsData.filter(l => l.approval_status === 'approved').length;
      const rejectedListings = listingsData.filter(l => l.approval_status === 'rejected').length;
      const activeListings = listingsData.filter(l => l.is_active === true).length;
      const featuredListings = listingsData.filter(l => l.featured === true).length;

      // Process bookings data
      const bookingsData = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data || [] : [];
      const totalBookings = bookingsData.length;
      const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
      const confirmedBookings = bookingsData.filter(b => b.status === 'confirmed').length;
      const completedBookings = bookingsData.filter(b => b.status === 'completed').length;
      const cancelledBookings = bookingsData.filter(b => b.status === 'cancelled').length;

      // Process payments data
      const paymentsData = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : [];
      const successfulPayments = paymentsData.filter(p => p.status === 'succeeded').length;
      const failedPayments = paymentsData.filter(p => p.status === 'failed').length;
      const pendingPayments = paymentsData.filter(p => p.status === 'pending').length;
      
      const totalRevenue = paymentsData
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      const platformFees = paymentsData
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + (Number(p.platform_fee) || 0), 0);

      // Process pending payments for release
      const pendingPaymentsData = pendingPaymentsResult.status === 'fulfilled' ? pendingPaymentsResult.value.data || [] : [];
      const escrowPayments = paymentsData.filter(p => p.status === 'held_in_escrow');
      
      const escrowSummaryData = {
        totalEscrowAmount: escrowPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        pendingReleases: escrowPayments.length,
        completedReleases: paymentsData.filter(p => p.status === 'released').length,
        failedReleases: paymentsData.filter(p => p.status === 'release_failed').length
      };
      
      const averageBookingValue = successfulPayments > 0 ? totalRevenue / successfulPayments : 0;

      // Process pending listings
      const pendingListingsData = pendingListingsResult.status === 'fulfilled' ? 
        pendingListingsResult.value.data || [] : [];
      
      const formattedPendingListings: PendingListing[] = pendingListingsData.map(listing => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price_per_day: listing.price_per_day,
        category: listing.category,
        images: listing.images || [],
        created_at: listing.created_at,
        owner: {
          id: (listing.profiles as any)?.id || '',
          full_name: (listing.profiles as any)?.full_name || 'Unknown',
          email: (listing.profiles as any)?.email || '',
          avatar_url: (listing.profiles as any)?.avatar_url,
          verified: (listing.profiles as any)?.verified || false
        }
      }));

      // Generate recent activity from various data sources
      const recentActivityData: RecentActivity[] = [];
      
      // Add recent user registrations
      usersData
        .filter(user => new Date(user.created_at) >= subDays(currentDate, 7))
        .slice(0, 5)
        .forEach(user => {
          recentActivityData.push({
            id: `user-${user.id}`,
            type: 'user_registration',
            description: 'New user registration',
            user_name: (user as any).full_name || 'Anonymous User',
            user_avatar: (user as any).avatar_url,
            timestamp: user.created_at,
            status: user.verified ? 'approved' : 'pending',
            metadata: { userId: user.id }
          });
        });

      // Add recent listings
      listingsData
        .filter(listing => new Date(listing.created_at) >= subDays(currentDate, 7))
        .slice(0, 5)
        .forEach(listing => {
          recentActivityData.push({
            id: `listing-${listing.id}`,
            type: 'listing_created',
            description: `New ${listing.category} listing created`,
            user_name: 'Listing Owner',
            timestamp: listing.created_at,
            status: listing.approval_status as any,
            metadata: { listingId: listing.id, category: listing.category }
          });
        });

      // Sort by timestamp
      recentActivityData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Generate intelligent system alerts based on real data
      const alerts: SystemAlert[] = [];

      // Alert for pending listings that need attention
      if (pendingListingsCount > 5) {
        alerts.push({
          id: 'alert-pending',
          type: 'warning',
          title: 'Pending approvals',
          message: `${pendingListingsCount} listings awaiting approval`,
          timestamp: new Date().toISOString(),
          priority: pendingListingsCount > 15 ? 'high' : 'medium',
          resolved: false,
          action_required: true
        });
      }

      // Alert for unusual booking patterns
      const expectedBookings = Math.max(10, Math.round(totalBookings * 0.8)); // Assume 20% weekly variation is normal
      const bookingDeviation = Math.abs(totalBookings - expectedBookings) / expectedBookings;
      
      if (bookingDeviation > 0.3) { // More than 30% deviation
        const isHigher = totalBookings > expectedBookings;
        alerts.push({
          id: 'alert-bookings',
          type: isHigher ? 'info' : 'warning',
          title: isHigher ? 'High booking volume' : 'Low booking volume',
          message: `Booking volume is ${Math.round(bookingDeviation * 100)}% ${isHigher ? 'higher' : 'lower'} than expected this week`,
          timestamp: new Date().toISOString(),
          priority: bookingDeviation > 0.5 ? 'high' : 'medium',
          resolved: false,
          action_required: !isHigher // Low volume requires action
        });
      }

      // Alert for failed payments
      if (failedPayments > 0) {
        alerts.push({
          id: 'alert-payments',
          type: 'error',
          title: 'Payment failures',
          message: `${failedPayments} payment${failedPayments > 1 ? 's' : ''} failed recently`,
          timestamp: new Date().toISOString(),
          priority: failedPayments > 5 ? 'high' : 'medium',
          resolved: false,
          action_required: true
        });
      }

      // Alert for user verification backlog
      const unverifiedUsers = totalUsers - verifiedUsers;
      if (unverifiedUsers > 10) {
        alerts.push({
          id: 'alert-verification',
          type: 'info',
          title: 'Verification backlog',
          message: `${unverifiedUsers} users pending verification`,
          timestamp: new Date().toISOString(),
          priority: 'low',
          resolved: false,
          action_required: false
        });
      }

      // Alert for system maintenance (example - could be dynamic)
      const isMaintenanceDay = currentDate.getDay() === 0; // Sunday
      if (isMaintenanceDay) {
        alerts.push({
          id: 'alert-maintenance',
          type: 'info',
          title: 'Weekly maintenance',
          message: 'System maintenance window: Sunday 2-4 AM',
          timestamp: new Date().toISOString(),
          priority: 'low',
          resolved: false,
          action_required: false
        });
      }

      // Alert for platform health
      const successRate = successfulPayments / (successfulPayments + failedPayments + pendingPayments);
      if (successRate < 0.9 && (successfulPayments + failedPayments) > 10) {
        alerts.push({
          id: 'alert-health',
          type: 'warning',
          title: 'Payment success rate low',
          message: `Payment success rate is ${Math.round(successRate * 100)}% (target: 90%+)`,
          timestamp: new Date().toISOString(),
          priority: successRate < 0.8 ? 'high' : 'medium',
          resolved: false,
          action_required: true
        });
      }

      // Update state
      setStats({
        totalUsers,
        usersThisWeek,
        usersLastWeek,
        verifiedUsers,
        activeUsers,
        totalListings,
        pendingListings: pendingListingsCount,
        approvedListings,
        activeListings,
        rejectedListings,
        featuredListings,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        successfulPayments,
        failedPayments,
        pendingPayments,
        platformFees,
        averageBookingValue,
      });

      setPendingListings(formattedPendingListings);
      setRecentActivity(recentActivityData.slice(0, 10));
      setSystemAlerts(alerts);
      setPendingPayments(pendingPaymentsData);
      setEscrowSummary(escrowSummaryData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount / 100); // Convert from cents
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleApproveListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ 
          approval_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (error) throw error;

      toast.success('Listing approved successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error approving listing:', error);
      toast.error('Failed to approve listing');
    }
  };

  const handleRejectListing = async (listingId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ 
          approval_status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (error) throw error;

      toast.success('Listing rejected');
      loadDashboardData();
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast.error('Failed to reject listing');
    }
  };

  const handleResolveAlert = (alertId: string) => {
    setSystemAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true }
          : alert
      )
    );
    toast.success('Alert resolved');
  };

  const handleReleasePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'released',
          released_at: new Date().toISOString(),
          released_by: 'admin'
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment released successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error releasing payment:', error);
      toast.error('Failed to release payment');
    }
  };

  const handleHoldPayment = async (paymentId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'on_hold',
          hold_reason: reason,
          held_at: new Date().toISOString(),
          held_by: 'admin'
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment placed on hold');
      loadDashboardData();
    } catch (error) {
      console.error('Error holding payment:', error);
      toast.error('Failed to hold payment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertColor = (type: string, priority: string) => {
    if (priority === 'critical') return 'bg-red-50 border-red-200';
    if (priority === 'high') return 'bg-orange-50 border-orange-200';
    if (type === 'warning') return 'bg-yellow-50 border-yellow-200';
    if (type === 'error') return 'bg-red-50 border-red-200';
    if (type === 'success') return 'bg-green-50 border-green-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return Users;
      case 'listing_created': return Package;
      case 'booking_made': return Calendar;
      case 'payment_completed': return CreditCard;
      case 'review_posted': return Star;
      case 'report_filed': return Flag;
      default: return Activity;
    }
  };

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Access denied. Admin privileges required.</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header with Actions */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Admin Dashboard</h1>
          <p className="text-gray-600">Here's what's happening with your platform today</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            leftIcon={refreshing ? undefined : <RefreshCw className="w-4 h-4" />}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/reports')}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Metric */}
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {stats.usersThisWeek >= stats.usersLastWeek ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${stats.usersThisWeek >= stats.usersLastWeek ? 'text-green-600' : 'text-red-600'}`}>
              {stats.usersLastWeek > 0 ? Math.round(((stats.usersThisWeek - stats.usersLastWeek) / stats.usersLastWeek) * 100) : 0}%
            </span>
            <span className="text-sm text-gray-500 ml-2">from last week</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {stats.verifiedUsers} verified • {stats.activeUsers} active
          </div>
        </Card>

        {/* Listings Metric */}
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Listings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalListings.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600 font-medium">{stats.approvedListings}</span>
            <span className="text-sm text-gray-500 ml-2">approved</span>
            {stats.pendingListings > 0 && (
              <>
                <Clock className="w-4 h-4 text-yellow-500 ml-3 mr-1" />
                <span className="text-sm text-yellow-600 font-medium">{stats.pendingListings}</span>
                <span className="text-sm text-gray-500 ml-1">pending</span>
              </>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {stats.activeListings} active • {stats.featuredListings} featured
          </div>
        </Card>

        {/* Bookings Metric */}
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600 font-medium">{stats.completedBookings}</span>
            <span className="text-sm text-gray-500 ml-2">completed</span>
            {stats.pendingBookings > 0 && (
              <>
                <Clock className="w-4 h-4 text-blue-500 ml-3 mr-1" />
                <span className="text-sm text-blue-600 font-medium">{stats.pendingBookings}</span>
                <span className="text-sm text-gray-500 ml-1">pending</span>
              </>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {stats.confirmedBookings} confirmed • {stats.cancelledBookings} cancelled
          </div>
        </Card>

        {/* Revenue Metric */}
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600 font-medium">{stats.successfulPayments}</span>
            <span className="text-sm text-gray-500 ml-2">successful</span>
            {stats.failedPayments > 0 && (
              <>
                <XCircle className="w-4 h-4 text-red-500 ml-3 mr-1" />
                <span className="text-sm text-red-600 font-medium">{stats.failedPayments}</span>
                <span className="text-sm text-gray-500 ml-1">failed</span>
              </>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Platform fees: {formatCurrency(stats.platformFees)} • Avg: {formatCurrency(stats.averageBookingValue)}
          </div>
        </Card>
      </div>

      {/* Pending Approvals & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Listings Approval Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-500 mr-2" />
                Pending Approvals
                {stats.pendingListings > 0 && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    {stats.pendingListings}
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/listings?status=pending')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingListings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No pending approvals</p>
                <p className="text-sm">All listings have been reviewed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingListings.slice(0, 3).map((listing) => (
                  <div key={listing.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 truncate">{listing.title}</h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {listing.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {formatCurrency(listing.price_per_day * 100)}/day
                          </span>
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {listing.owner.full_name}
                            {listing.owner.verified && (
                              <CheckCircle className="w-3 h-3 ml-1 text-green-500" />
                            )}
                          </span>
                          <span>{format(new Date(listing.created_at), 'MMM d')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectListing(listing.id, 'Requires review')}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveListing(listing.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingListings.length > 3 && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/admin/listings?status=pending')}
                    >
                      View {pendingListings.length - 3} more pending
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 text-blue-500 mr-2" />
                System Alerts
                {systemAlerts.filter(a => !a.resolved).length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    {systemAlerts.filter(a => !a.resolved).length}
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/settings')}
              >
                Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {systemAlerts.filter(a => !a.resolved).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                <p>All systems operational</p>
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {systemAlerts.filter(a => !a.resolved).map((alert) => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${getAlertColor(alert.type, alert.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                        {alert.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                        {alert.type === 'info' && <Bell className="w-5 h-5 text-blue-500 mt-0.5" />}
                        {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{alert.title}</p>
                            {alert.priority === 'critical' && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                                Critical
                              </span>
                            )}
                            {alert.priority === 'high' && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                                High
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {format(new Date(alert.timestamp), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveAlert(alert.id)}
                        className="ml-3"
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 text-purple-500 mr-2" />
              Recent Activity
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/reports')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Activity will appear here as users interact with the platform</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const IconComponent = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{activity.user_name}</p>
                          {activity.user_avatar && (
                            <img
                              src={activity.user_avatar}
                              alt={activity.user_name}
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-400">
                          {isToday(new Date(activity.timestamp)) 
                            ? format(new Date(activity.timestamp), 'HH:mm')
                            : isYesterday(new Date(activity.timestamp))
                            ? `Yesterday ${format(new Date(activity.timestamp), 'HH:mm')}`
                            : format(new Date(activity.timestamp), 'MMM d, HH:mm')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                      </span>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Release Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 text-green-500 mr-2" />
              Payment Release Management
              {escrowSummary.pendingReleases > 0 && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  {escrowSummary.pendingReleases} pending
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/payment-releases')}
            >
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Escrow Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Escrow</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(escrowSummary.totalEscrowAmount)}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Pending Release</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {escrowSummary.pendingReleases}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Completed</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {escrowSummary.completedReleases}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Failed</p>
                  <p className="text-2xl font-bold text-red-900">
                    {escrowSummary.failedReleases}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Pending Payments List */}
          {pendingPayments.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Pending Payment Releases</h4>
              {pendingPayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {payment.bookings?.listings?.title || 'Unknown Listing'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.bookings?.profiles?.full_name || 'Unknown Renter'} → {payment.bookings?.listings?.profiles?.full_name || 'Unknown Owner'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Booking: {payment.bookings?.start_date} to {payment.bookings?.end_date}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleHoldPayment(payment.id, 'Manual review required')}
                        className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Hold
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReleasePayment(payment.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Release
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingPayments.length > 5 && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin/payment-releases')}
                  >
                    View All {pendingPayments.length} Pending Payments
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending payment releases</p>
              <p className="text-sm text-gray-400">All payments are up to date</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
} 