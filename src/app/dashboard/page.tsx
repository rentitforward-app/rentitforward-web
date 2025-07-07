'use client';

import Link from 'next/link'
import { Search, Star, ArrowRight, User, List, DollarSign, Plus, Eye, Heart, Calendar, Package, TrendingUp, MessageCircle, Bell, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAdmin } from '@/hooks/use-admin'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

const categories = [
  { 
    name: 'Tools & DIY', 
    icon: '🔧', 
    slug: 'tools-diy',
    items: ['drills', 'saws', 'ladders', 'power tools']
  },
  { 
    name: 'Electronics', 
    icon: '📱', 
    slug: 'electronics',
    items: ['laptops', 'tablets', 'gaming', 'audio devices']
  },
  { 
    name: 'Cameras', 
    icon: '📷', 
    slug: 'cameras',
    items: ['DSLR cameras', 'lenses', 'tripods', 'lighting']
  },
  { 
    name: 'Sports & Outdoors', 
    icon: '🚴', 
    slug: 'sports-outdoors',
    items: ['bikes', 'kayaks', 'camping gear', 'sports equipment']
  },
  { 
    name: 'Event & Party', 
    icon: '🎉', 
    slug: 'event-party',
    items: ['speakers', 'decorations', 'costumes', 'party supplies']
  },
  { 
    name: 'Tools & Equipment', 
    icon: '🔨', 
    slug: 'tools-equipment',
    items: ['pressure washers', 'generators', 'lawn equipment', 'construction tools']
  },
]

// Define types for our data
interface Activity {
  type: string;
  message: string;
  time: string;
  icon: React.ComponentType<any>;
}

interface RecentBooking {
  id: string;
  item: string;
  renter: string;
  status: string;
  amount: number;
  period: string;
}

// Dashboard Overview Component for Logged-in Users
export default function DashboardPage() {
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [stats, setStats] = useState({
    totalListings: 0,
    activeRentals: 0,
    totalEarnings: 0,
    totalViews: 0,
    pendingBookings: 0,
    unreadMessages: 0
  })
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user?.id) return
    
    try {
      // Fetch user listings
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)

      // Fetch user bookings as renter (active rentals)
      const { data: asRenter } = await supabase
        .from('bookings')
        .select('*')
        .eq('renter_id', user.id)
        .in('status', ['confirmed', 'in_progress'])

      // Fetch user bookings as owner (for earnings and pending)
      const { data: asOwner } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', user.id)

      // Fetch unread messages
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .is('read_at', null)

      // Calculate stats
      const totalListings = listings?.length || 0
      const activeRentals = asRenter?.length || 0
      const totalViews = listings?.reduce((sum, listing) => sum + (listing.view_count || 0), 0) || 0
      const pendingBookings = (asOwner?.filter(b => b.status === 'pending') || []).length

      // Calculate real earnings from completed bookings
      const completedBookings = asOwner?.filter(b => b.status === 'completed') || []
      const totalEarnings = completedBookings.reduce((sum, booking) => {
        // Subtract platform fee from total amount to get owner earnings
        const ownerEarnings = (booking.total_amount || 0) - (booking.platform_fee || 0)
        return sum + ownerEarnings
      }, 0)

      setStats({
        totalListings,
        activeRentals,
        totalEarnings: Math.round(totalEarnings),
        totalViews,
        pendingBookings,
        unreadMessages: unreadMessages?.length || 0
      })

      // Fetch recent activity
      const activities: Activity[] = []

      // Add recent booking requests
      const recentPendingBookings = asOwner?.filter(b => b.status === 'pending')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2) || []

      for (const booking of recentPendingBookings) {
        const { data: listing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', booking.item_id)
          .single()

        activities.push({
          type: 'booking',
          message: `New booking request for "${listing?.title || 'Unknown item'}"`,
          time: formatTimeAgo(booking.created_at),
          icon: Calendar
        })
      }

      // Add recent messages
      const { data: recentMessagesData } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2)

      for (const message of recentMessagesData || []) {
        activities.push({
          type: 'message',
          message: `${message.sender?.full_name || 'Someone'} sent you a message`,
          time: formatTimeAgo(message.created_at),
          icon: MessageCircle
        })
      }

      // Add recent completed rentals
      const recentCompletedBookings = asOwner?.filter(b => b.status === 'completed')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 2) || []

      for (const booking of recentCompletedBookings) {
        const { data: listing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', booking.item_id)
          .single()

        activities.push({
          type: 'rental',
          message: `Rental completed: "${listing?.title || 'Unknown item'}"`,
          time: formatTimeAgo(booking.updated_at),
          icon: Package
        })
      }

      // Sort activities by time and take the most recent ones
      activities.sort((a, b) => {
        // Since we can't reliably sort by created_at/updated_at, keep them as they are
        return 0
      })
      setRecentActivity(activities.slice(0, 4))

      // Fetch recent bookings with listing and renter details
      const { data: recentBookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          listing:item_id(title),
          renter:renter_id(full_name)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      const recentBookingsList: RecentBooking[] = recentBookingsData?.map(booking => ({
        id: booking.id,
        item: booking.listing?.title || 'Unknown item',
        renter: booking.renter?.full_name || 'Unknown renter',
        status: booking.status,
        amount: Math.round(booking.total_amount || 0),
        period: `${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`
      })) || []

      setRecentBookings(recentBookingsList)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.user_metadata?.full_name || 'there'}!</h1>
          <p className="text-green-100">Here's what's happening with your rentals</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeRentals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Eye className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-pink-100 rounded-lg">
                <MessageCircle className="w-6 h-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unreadMessages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            {isAdmin && !adminLoading && (
              <Link 
                href="/admin/dashboard" 
                className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin Panel
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Link href="/listings/create" className="btn-primary p-4 rounded-lg text-center hover:bg-green-600 transition-colors">
              <Plus className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">Create Listing</span>
            </Link>
            <Link href="/listings" className="bg-indigo-500 text-white p-4 rounded-lg text-center hover:bg-indigo-600 transition-colors">
              <List className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">My Listings</span>
            </Link>
            <Link href="/browse" className="bg-blue-500 text-white p-4 rounded-lg text-center hover:bg-blue-600 transition-colors">
              <Search className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">Browse Items</span>
            </Link>
            <Link href="/bookings" className="bg-purple-500 text-white p-4 rounded-lg text-center hover:bg-purple-600 transition-colors">
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">My Bookings</span>
            </Link>
            <Link href="/messages" className="bg-orange-500 text-white p-4 rounded-lg text-center hover:bg-orange-600 transition-colors">
              <MessageCircle className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">Messages</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Link href="/notifications" className="text-sm text-green-600 hover:text-green-700">View all</Link>
            </div>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <activity.icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-3">
                    <Bell className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No recent activity</p>
                  <p className="text-gray-400 text-xs mt-1">Your latest bookings and messages will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <Link href="/bookings" className="text-sm text-green-600 hover:text-green-700">View all</Link>
            </div>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{booking.item}</p>
                      <p className="text-sm text-gray-600">Renter: {booking.renter}</p>
                      <p className="text-xs text-gray-500">{booking.period}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${booking.amount}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No bookings yet</p>
                  <p className="text-gray-400 text-xs mt-1">Your recent booking requests will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Popular Categories for Quick Browsing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Popular Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((category, index) => (
              <Link 
                key={index}
                href={`/browse?category=${category.slug}`}
                className="text-center p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <h3 className="text-sm font-medium text-gray-900 group-hover:text-green-600">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
} 