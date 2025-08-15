'use client';

import Link from 'next/link'
import { Search, Star, ArrowRight, User, List, DollarSign, Plus, Eye, Heart, Calendar, Package, TrendingUp, MessageCircle, Bell, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAdmin } from '@/hooks/use-admin'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup'
import { useStripeConnect } from '@/hooks/useStripeConnect'

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
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const { status: stripeStatus, isLoading: stripeLoading } = useStripeConnect()
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
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    console.log('Dashboard useEffect triggered, user:', user)
    if (user) {
      fetchDashboardData()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchDashboardData = async () => {
    if (!user?.id) {
      console.log('No user ID available')
      setLoading(false)
      return
    }
    
    console.log('Fetching dashboard data for user:', user.id)
    
    try {
      // Fetch user listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)

      if (listingsError) {
        console.error('Error fetching listings:', listingsError)
        throw listingsError
      }

      // Fetch user bookings as renter (active rentals)
      const { data: asRenter, error: renterError } = await supabase
        .from('bookings')
        .select('*')
        .eq('renter_id', user.id)
        .in('status', ['confirmed', 'in_progress'])

      if (renterError) {
        console.error('Error fetching renter bookings:', renterError)
      }

      // Fetch user bookings as owner (for earnings and pending)
      const { data: asOwner, error: ownerError } = await supabase
        .from('bookings')
        .select(`
          *,
          listing:listing_id(title),
          renter:renter_id(full_name)
        `)
        .eq('owner_id', user.id)

      if (ownerError) {
        console.error('Error fetching owner bookings:', ownerError)
      }

      // Fetch unread messages
      const { data: unreadMessages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .is('read_at', null)

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
      }

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

      console.log('Stats calculated:', {
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
        activities.push({
          type: 'booking',
          message: `New booking request for "${booking.listing?.title || 'Unknown item'}"`,
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
        activities.push({
          type: 'rental',
          message: `Rental completed: "${booking.listing?.title || 'Unknown item'}"`,
          time: formatTimeAgo(booking.updated_at),
          icon: Package
        })
      }

      // Sort activities by recency and take top 5
      activities.sort((a, b) => {
        // This is a simplified sort, in a real app you'd want to parse the time strings
        return Math.random() - 0.5 // Random for now since we have mixed time formats
      })
      setRecentActivity(activities.slice(0, 5))

      // Set recent bookings
      const recentBookingsData: RecentBooking[] = (asOwner || [])
        .slice(0, 5)
        .map(booking => ({
          id: booking.id,
          item: booking.listing?.title || 'Unknown item',
          renter: booking.renter?.full_name || 'Unknown user',
          status: booking.status,
          amount: booking.total_amount || 0,
          period: formatDate(booking.start_date) + ' - ' + formatDate(booking.end_date)
        }))

      setRecentBookings(recentBookingsData)

      console.log('Recent activity:', activities)
      console.log('Recent bookings:', recentBookingsData)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  console.log('Dashboard render state:', { user: !!user, authLoading, loading, error })

  if (authLoading) {
    console.log('Auth is loading...')
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="text-center">
            <p>Loading authentication...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!user) {
    console.log('No user found')
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="text-center">
            <p>Please log in to view your dashboard.</p>
            <Link href="/login" className="text-green-600 hover:text-green-700">
              Go to Login
            </Link>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (loading) {
    console.log('Dashboard data is loading...')
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

  if (error) {
    console.log('Dashboard error:', error)
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>Error loading dashboard: {error}</p>
            </div>
            <button 
              onClick={() => {
                setError(null)
                setLoading(true)
                fetchDashboardData()
              }}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  console.log('Rendering main dashboard content')
  
  return (
    <AuthenticatedLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg md:rounded-xl p-4 md:p-6 text-white">
          <h1 className="text-xl md:text-2xl font-bold mb-2">Welcome back, {user?.user_metadata?.full_name || user?.email || 'there'}!</h1>
          <p className="text-sm md:text-base text-green-100">Here's what's happening with your rentals</p>
        </div>

        {/* Admin Panel Link */}
        {isAdmin && !adminLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm md:text-base text-blue-900 font-medium">Admin Access</span>
              </div>
              <Link 
                href="/admin" 
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center text-sm md:text-base"
              >
                Go to Admin Panel <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
            <div className="flex items-center">
              <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                <Package className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div className="ml-2 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Total Listings</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.totalListings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
            <div className="flex items-center">
              <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                <Calendar className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
              </div>
              <div className="ml-2 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Active Bookings</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.activeRentals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6 col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="p-2 md:p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
              </div>
              <div className="ml-2 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Total Earnings</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">${stats.totalEarnings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
            <div className="flex items-center">
              <div className="p-2 md:p-3 bg-yellow-100 rounded-lg">
                <Eye className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
              </div>
              <div className="ml-2 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Total Views</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.totalViews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
            <div className="flex items-center">
              <div className="p-2 md:p-3 bg-orange-100 rounded-lg">
                <Bell className="w-4 h-4 md:w-6 md:h-6 text-orange-600" />
              </div>
              <div className="ml-2 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Pending Bookings</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.pendingBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
            <div className="flex items-center">
              <div className="p-2 md:p-3 bg-indigo-100 rounded-lg">
                <MessageCircle className="w-4 h-4 md:w-6 md:h-6 text-indigo-600" />
              </div>
              <div className="ml-2 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Unread Messages</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.unreadMessages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Connect Setup - Show if not fully set up */}
        {!stripeLoading && (!stripeStatus?.has_account || !stripeStatus?.onboarding_completed || !stripeStatus?.payouts_enabled) && (
          <div className="mb-6">
            <StripeConnectSetup 
              requiredForAction="create listings and receive payouts"
              variant="card"
              showTitle={false}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {stripeStatus?.has_account && stripeStatus?.onboarding_completed && stripeStatus?.payouts_enabled ? (
              <Link href="/listings/create" className="btn-primary p-3 md:p-4 rounded-lg text-center hover:bg-green-600 transition-colors">
                <Plus className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-2" />
                <span className="text-sm md:text-base font-medium">Create Listing</span>
              </Link>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 p-3 md:p-4 rounded-lg text-center">
                <Shield className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-2 text-yellow-600" />
                <span className="text-sm md:text-base font-medium text-yellow-800">Setup Payouts</span>
                <p className="text-xs text-yellow-600 mt-1">Required to list items</p>
              </div>
            )}
            <Link href="/listings" className="bg-indigo-500 text-white p-3 md:p-4 rounded-lg text-center hover:bg-indigo-600 transition-colors">
              <List className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-2" />
              <span className="text-sm md:text-base font-medium">My Listings</span>
            </Link>
            <Link href="/browse" className="bg-blue-500 text-white p-3 md:p-4 rounded-lg text-center hover:bg-blue-600 transition-colors">
              <Search className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-2" />
              <span className="text-sm md:text-base font-medium">Browse Items</span>
            </Link>
            <Link href="/favorites" className="bg-red-500 text-white p-3 md:p-4 rounded-lg text-center hover:bg-red-600 transition-colors">
              <Heart className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-2" />
              <span className="text-sm md:text-base font-medium">Saved Items</span>
            </Link>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <activity.icon className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm text-gray-900 break-words">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <TrendingUp className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto mb-2 md:mb-3" />
                <p className="text-sm md:text-base text-gray-500">No recent activity yet</p>
                <p className="text-xs md:text-sm text-gray-400">Activity will appear here as you use the platform</p>
              </div>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Recent Bookings</h2>
            {recentBookings.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="text-sm md:text-base font-medium text-gray-900 break-words flex-1">{booking.item}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mb-1 break-words">Renter: {booking.renter}</p>
                    <p className="text-xs md:text-sm text-gray-600 mb-1 break-words">Period: {booking.period}</p>
                    <p className="text-sm md:text-base font-medium text-gray-900">${booking.amount}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <Calendar className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto mb-2 md:mb-3" />
                <p className="text-sm md:text-base text-gray-500">No bookings yet</p>
                <p className="text-xs md:text-sm text-gray-400">Your rental bookings will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Browse Categories */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Browse Popular Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/browse?category=${category.slug}`}
                className="group p-3 md:p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all"
              >
                <div className="flex items-center mb-2">
                  <span className="text-xl md:text-2xl mr-2 md:mr-3 flex-shrink-0">{category.icon}</span>
                  <h3 className="text-sm md:text-base font-medium text-gray-900 group-hover:text-green-700 break-words">
                    {category.name}
                  </h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 break-words">
                  {category.items.slice(0, 2).join(', ')}{category.items.length > 2 && ', ...'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
} 