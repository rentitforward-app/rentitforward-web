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
  Flag
} from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { format, subDays } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface DashboardStats {
  totalUsers: number;
  usersThisWeek: number;
  usersLastWeek: number;
  totalListings: number;
  pendingListings: number;
  approvedListings: number;
  activeListings: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  totalRevenue: number;
  successfulPayments: number;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    usersThisWeek: 0,
    usersLastWeek: 0,
    totalListings: 0,
    pendingListings: 0,
    approvedListings: 0,
    activeListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    successfulPayments: 0,
  });
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

  const loadDashboardData = async () => {
    try {
      // Get users statistics
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, created_at');

      const totalUsers = usersData?.length || 0;
      const usersThisWeek = usersData?.filter(user => 
        new Date(user.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0;
      const usersLastWeek = usersData?.filter(user => {
        const createdAt = new Date(user.created_at);
        return createdAt >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
               createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }).length || 0;

      // Get listings statistics
      const { data: listingsData } = await supabase
        .from('listings')
        .select('approval_status, is_active');

      const totalListings = listingsData?.length || 0;
      const pendingListings = listingsData?.filter(l => l.approval_status === 'pending').length || 0;
      const approvedListings = listingsData?.filter(l => l.approval_status === 'approved').length || 0;
      const activeListings = listingsData?.filter(l => l.is_active === true).length || 0;

      // Get bookings statistics
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('status');

      const totalBookings = bookingsData?.length || 0;
      const pendingBookings = bookingsData?.filter(b => b.status === 'pending').length || 0;
      const confirmedBookings = bookingsData?.filter(b => b.status === 'confirmed').length || 0;
      const completedBookings = bookingsData?.filter(b => b.status === 'completed').length || 0;

      // Get payment statistics
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, status');

      const successfulPayments = paymentsData?.filter(p => p.status === 'succeeded').length || 0;
      const totalRevenue = paymentsData?.filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

      setStats({
        totalUsers,
        usersThisWeek,
        usersLastWeek,
        totalListings,
        pendingListings,
        approvedListings,
        activeListings,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        totalRevenue,
        successfulPayments,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
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
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Admin Dashboard</h1>
        <p className="text-gray-600">Here's what's happening with your platform today</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
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
              <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${stats.usersThisWeek >= stats.usersLastWeek ? 'text-green-600' : 'text-red-600'}`}>
              {stats.usersLastWeek > 0 ? Math.round(((stats.usersThisWeek - stats.usersLastWeek) / stats.usersLastWeek) * 100) : 0}%
            </span>
            <span className="text-sm text-gray-500 ml-2">from last week</span>
          </div>
        </Card>

        <Card className="p-6">
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
            <span className="text-sm text-gray-500 ml-2">approved listings</span>
          </div>
        </Card>

        <Card className="p-6">
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
            <Clock className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-sm text-blue-600 font-medium">{stats.pendingBookings}</span>
            <span className="text-sm text-gray-500 ml-2">pending bookings</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue / 100)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600 font-medium">{stats.successfulPayments}</span>
            <span className="text-sm text-gray-500 ml-2">successful payments</span>
          </div>
        </Card>
      </div>

      {/* Pending Approvals & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <Package className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Listing Reviews</p>
                  <p className="text-sm text-gray-500">New listings awaiting approval</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold text-yellow-600">{stats.pendingListings}</span>
                <Button size="sm" onClick={() => router.push('/admin/listings')}>
                  Review
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Active Bookings</p>
                  <p className="text-sm text-gray-500">Confirmed bookings in progress</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold text-blue-600">{stats.confirmedBookings}</span>
                <Button size="sm" onClick={() => router.push('/admin/bookings')}>
                  Review
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Completed Bookings</p>
                  <p className="text-sm text-gray-500">Successfully completed rentals</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold text-green-600">{stats.completedBookings}</span>
                <Button size="sm" onClick={() => router.push('/admin/bookings')}>
                  View
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* System Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">High booking volume</p>
                <p className="text-sm text-gray-500">Booking volume is 23% higher than usual this week</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(), 'MMM d, HH:mm')}
                </p>
              </div>
              <Button size="sm" variant="outline">
                Resolve
              </Button>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">Scheduled maintenance</p>
                <p className="text-sm text-gray-500">Database backup scheduled for tonight at 2 AM</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(), 'MMM d, HH:mm')}
                </p>
              </div>
              <Button size="sm" variant="outline">
                Resolve
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/reports')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              View Reports
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Sarah Johnson</p>
                <p className="text-sm text-gray-500">New user registration</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(), 'MMM d, HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <Package className="w-4 h-4 text-green-500" />
              <div>
                <p className="font-medium text-gray-900">Mike Chen</p>
                <p className="text-sm text-gray-500">Listed "Professional Camera Kit"</p>
                <p className="text-xs text-gray-400">
                  {format(subDays(new Date(), 1), 'MMM d, HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-purple-500" />
              <div>
                <p className="font-medium text-gray-900">Emma Wilson</p>
                <p className="text-sm text-gray-500">Booked "Mountain Bike" for 3 days</p>
                <p className="text-xs text-gray-400">
                  {format(subDays(new Date(), 1), 'MMM d, HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <Flag className="w-4 h-4 text-red-500" />
              <div>
                <p className="font-medium text-gray-900">David Brown</p>
                <p className="text-sm text-gray-500">Reported inappropriate listing content</p>
                <p className="text-xs text-gray-400">
                  {format(subDays(new Date(), 2), 'MMM d, HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-20 flex-col space-y-2"
            onClick={() => router.push('/admin/users')}
          >
            <Users className="w-6 h-6" />
            <span>Manage Users</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col space-y-2"
            onClick={() => router.push('/admin/listings')}
          >
            <Package className="w-6 h-6" />
            <span>Review Listings</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col space-y-2"
            onClick={() => router.push('/admin/bookings')}
          >
            <Calendar className="w-6 h-6" />
            <span>View Bookings</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex-col space-y-2"
            onClick={() => router.push('/admin/reports')}
          >
            <BarChart3 className="w-6 h-6" />
            <span>Analytics</span>
          </Button>
        </div>
      </Card>
    </div>
  );
} 