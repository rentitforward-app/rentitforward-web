'use client';

import Link from 'next/link'
import { Search, Star, ArrowRight, User, List, DollarSign, Plus, Eye, Heart, Calendar, Package, TrendingUp, MessageCircle, Bell, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAdmin } from '@/hooks/use-admin'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

// Dashboard Overview Component for Logged-in Users
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({
    totalListings: 0,
    activeRentals: 0,
    totalEarnings: 0,
    totalViews: 0,
    pendingBookings: 0,
    unreadMessages: 0
  })
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

      console.log('Fetched listings:', listings)

      // Calculate stats
      const totalListings = listings?.length || 0
      
      setStats({
        totalListings,
        activeRentals: 0, // Simplified for now
        totalEarnings: 0, // Simplified for now
        totalViews: 0, // Simplified for now
        pendingBookings: 0, // Simplified for now
        unreadMessages: 0 // Simplified for now
      })

      console.log('Stats set:', { totalListings })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
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
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.user_metadata?.full_name || user?.email || 'there'}!</h1>
          <p className="text-green-100">Here's what's happening with your rentals</p>
        </div>

        {/* Debug Info */}
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <p><strong>Debug Info:</strong></p>
          <p>User ID: {user.id}</p>
          <p>Email: {user.email}</p>
          <p>Total Listings: {stats.totalListings}</p>
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
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </div>

        {/* Simple message for testing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Status</h2>
          <p className="text-green-600">✅ Dashboard is working! The previous blank page issue has been resolved.</p>
          <p className="text-gray-600 mt-2">More features will be added gradually.</p>
        </div>
      </div>
    </AuthenticatedLayout>
  )
} 