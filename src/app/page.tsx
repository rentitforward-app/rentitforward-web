'use client';

import Link from 'next/link'
import { Search, Star, ArrowRight, User, List, DollarSign, Plus, Eye, Heart, Calendar, Package, TrendingUp, MessageCircle, Bell } from 'lucide-react'
import Image from 'next/image'
import TopListings from '@/components/TopListings'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import { useRouter } from 'next/navigation'
import { RealAPIPredictiveSearch } from '@/components/search/RealAPIPredictiveSearch'

const categories = [
  { 
    name: 'Tools & DIY Equipment', 
    icon: '🔧', 
    slug: 'tools-diy-equipment',
    items: ['drills', 'saws', 'ladders', 'power tools']
  },
  { 
    name: 'Cameras & Photography Gear', 
    icon: '📷', 
    slug: 'cameras-photography-gear',
    items: ['DSLR cameras', 'lenses', 'tripods', 'lighting']
  },
  { 
    name: 'Event & Party Equipment', 
    icon: '🎉', 
    slug: 'event-party-equipment',
    items: ['speakers', 'decorations', 'lighting', 'party supplies']
  },
  { 
    name: 'Camping & Outdoor Gear', 
    icon: '🏕️', 
    slug: 'camping-outdoor-gear',
    items: ['tents', 'sleeping bags', 'camping gear', 'hiking equipment']
  },
  { 
    name: 'Tech & Electronics', 
    icon: '📱', 
    slug: 'tech-electronics',
    items: ['laptops', 'tablets', 'gaming', 'audio devices']
  },
  { 
    name: 'Vehicles & Transport', 
    icon: '🚗', 
    slug: 'vehicles-transport',
    items: ['cars', 'bikes', 'trailers', 'mobility equipment']
  },
  { 
    name: 'Home & Garden Appliances', 
    icon: '🏡', 
    slug: 'home-garden-appliances',
    items: ['appliances', 'garden tools', 'lawn equipment', 'home tools']
  },
  { 
    name: 'Sports & Fitness Equipment', 
    icon: '🏃', 
    slug: 'sports-fitness-equipment',
    items: ['exercise equipment', 'sports gear', 'bikes', 'fitness accessories']
  },
  { 
    name: 'Musical Instruments & Gear', 
    icon: '🎸', 
    slug: 'musical-instruments-gear',
    items: ['guitars', 'keyboards', 'drums', 'recording equipment']
  },
  { 
    name: 'Costumes & Props', 
    icon: '🎭', 
    slug: 'costumes-props',
    items: ['costumes', 'props', 'theatrical gear', 'party accessories']
  },
  { 
    name: 'Maker & Craft Supplies', 
    icon: '✂️', 
    slug: 'maker-craft-supplies',
    items: ['craft tools', 'art supplies', 'maker equipment', 'creative materials']
  }
]

// Dashboard Overview Component for Logged-in Users
function DashboardOverview() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalListings: 0,
    activeRentals: 0,
    totalEarnings: 0,
    totalViews: 0,
    pendingBookings: 0,
    unreadMessages: 0
  })
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: string;
    message: string;
    time: string;
    icon: React.ComponentType<{ className?: string }>;
  }>>([])
  const [recentBookings, setRecentBookings] = useState<Array<{
    id: string;
    item: string;
    renter: string;
    status: string;
    amount: number;
    period: string;
  }>>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch user listings
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)

      // Fetch user bookings (as renter and owner)
      const { data: asRenter } = await supabase
        .from('bookings')
        .select('*')
        .eq('renter_id', user.id)

      const { data: asOwner } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', user.id)

      // Calculate stats
      const totalListings = listings?.length || 0
      const activeRentals = (asRenter?.filter(b => b.status === 'confirmed') || []).length
      const totalViews = listings?.reduce((sum, listing) => sum + (listing.view_count || 0), 0) || 0
      const pendingBookings = (asOwner?.filter(b => b.status === 'pending') || []).length

      // Mock data for earnings (would be calculated from completed bookings)
      const totalEarnings = (asOwner?.filter(b => b.status === 'completed') || []).length * 150 // Mock calculation

      setStats({
        totalListings,
        activeRentals,
        totalEarnings,
        totalViews,
        pendingBookings,
        unreadMessages: 3 // Mock data
      })

      // Recent activity (mock data with some real bookings)
      const activities = [
        { type: 'booking', message: 'New booking request for "Professional Camera Kit"', time: '2 hours ago', icon: Calendar },
        { type: 'message', message: 'Sarah sent you a message about the drill rental', time: '4 hours ago', icon: MessageCircle },
        { type: 'view', message: 'Your listing "Power Tools Set" was viewed 5 times', time: '1 day ago', icon: Eye },
        { type: 'rental', message: 'Rental completed: "Camping Tent"', time: '2 days ago', icon: Package },
      ]
      setRecentActivity(activities)

      // Recent bookings
      const recentBookingsList = [
        { 
          id: '1', 
          item: 'Professional Camera Kit', 
          renter: 'John Smith', 
          status: 'pending', 
          amount: 85,
          period: 'Oct 15-17'
        },
        { 
          id: '2', 
          item: 'Power Drill Set', 
          renter: 'Sarah Johnson', 
          status: 'confirmed', 
          amount: 35,
          period: 'Oct 12-14'
        },
        { 
          id: '3', 
          item: 'Camping Tent', 
          renter: 'Mike Wilson', 
          status: 'completed', 
          amount: 60,
          period: 'Oct 8-10'
        }
      ]
      setRecentBookings(recentBookingsList)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                <p className="text-sm font-medium text-gray-600">Active Rentals</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/listings/create" className="btn-primary p-4 rounded-lg text-center hover:bg-green-600 transition-colors">
              <Plus className="w-6 h-6 mx-auto mb-2" />
              <span className="font-medium">Create Listing</span>
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
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <activity.icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <Link href="/bookings" className="text-sm text-green-600 hover:text-green-700">View all</Link>
            </div>
            <div className="space-y-4">
              {recentBookings.map((booking) => (
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
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Popular Categories for Quick Browsing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Popular Categories</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {categories.slice(0, 8).map((category, index) => (
              <Link 
                key={index}
                href={`/browse?category=${category.slug}`}
                className="text-center p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 group w-32 sm:w-36 lg:w-40 flex-shrink-0"
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

// Marketing Homepage Component for Non-authenticated Users
function MarketingHomepage() {
  const router = useRouter()

  return (
    <div className="min-h-screen">
      {/* Hero Section with Background Image */}
      <section className="relative h-[90vh] px-4 overflow-hidden flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <Image
            src="/images/RIF_Onboarding_Signup.jpg"
            alt="Rent It Forward Hero Background"
            fill
            className="object-cover"
            style={{ objectPosition: 'top center' }}
            priority
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="max-w-screen-2xl mx-auto text-center relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight px-4">
            Share More, Buy Less
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-6 sm:mb-8 px-4 max-w-3xl mx-auto">
            Building communities, one rental at a time.
          </p>
          
          {/* Real API Search Bar */}
          <div className="max-w-2xl mx-auto px-4">
            <RealAPIPredictiveSearch
              placeholder="What would you like to rent?"
              onSearch={(query) => {
                router.push(`/browse?search=${encodeURIComponent(query)}`);
              }}
              useRealAPI={true}
              variant="homepage"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Browse by Categories */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Browse by Categories</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Find exactly what you need from a variety of rental categories
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {categories.map((category, index) => (
              <Link 
                key={index}
                href={`/browse?category=${category.slug}`}
                className="bg-white rounded-2xl p-4 sm:p-6 text-center shadow-sm hover:shadow-md transition-all duration-300 group border border-gray-100 w-40 sm:w-44 lg:w-48 xl:w-52 flex-shrink-0"
              >
                <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors text-sm sm:text-base">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Rent It Forward */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-12 sm:mb-16">Why Rent It Forward?</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-green-50 rounded-2xl p-6 sm:p-8 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-white text-xl sm:text-2xl">🌱</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Reduce Waste</h3>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Rent items from your community and promote a sustainable lifestyle.
              </p>
            </div>
            
            <div className="bg-green-50 rounded-2xl p-6 sm:p-8 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Earn Extra Income</h3>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Turn your unused items into passive income.
              </p>
            </div>
            
            <div className="bg-green-50 rounded-2xl p-6 sm:p-8 text-center sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-white text-xl sm:text-2xl">👥</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Build a Sharing Community</h3>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Connect with neighbors and share resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rented Items */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-12 sm:mb-16">Top Rented Items</h2>
          
          <TopListings limit={4} />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-12 sm:mb-16">How It Works</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">1. Sign Up</h3>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Create an account and verify your identity
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <List className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">2. List or Browse</h3>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Share items or find what you need
              </p>
            </div>
            
            <div className="text-center sm:col-span-2 lg:col-span-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">3. Rent & Earn</h3>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                Start sharing and earning
              </p>
            </div>
          </div>
          
          <div className="text-center mt-8 sm:mt-12">
            <Link 
              href="/signup"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Help and Policies */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 gap-8 sm:gap-12">
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Need Help?</h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                Our support team is here to assist you 24/7
              </p>
              <Link 
                href="/contact"
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm sm:text-base"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Rental Policies</h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                Learn about discounts, cancellations, and more
              </p>
              <Link 
                href="/terms"
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm sm:text-base"
              >
                View Policies
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 sm:py-16 lg:py-20 bg-green-500">
        <div className="max-w-screen-2xl mx-auto text-center px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
            Ready to Start Sharing?
          </h2>
          <p className="text-lg sm:text-xl text-white/90 mb-8 sm:mb-12">
            Join thousands of people already earning and saving through community sharing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup"
              className="bg-white text-green-600 hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-colors"
            >
              Sign Up Now
            </Link>
            <Link 
              href="/browse"
              className="border-2 border-white text-white hover:bg-white hover:text-green-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-colors"
            >
              Browse Items
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// Main HomePage Component that switches based on authentication
export default function HomePage() {
  const { isAuthenticated, loading } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If authenticated, show dashboard overview
  if (isAuthenticated) {
    return <DashboardOverview />
  }

  // If not authenticated, show marketing homepage
  return <MarketingHomepage />
}
