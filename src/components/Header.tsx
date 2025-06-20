'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X, Search, Bell, Plus, User, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { user, isAuthenticated, signOut, loading } = useAuth()

  // Show loading state while determining authentication
  if (loading) {
    // Smart logo link: if we're already on a protected page, assume user is authenticated
    const isOnProtectedPage = typeof window !== 'undefined' && 
      (window.location.pathname.startsWith('/dashboard') || 
       window.location.pathname.startsWith('/profile') || 
       window.location.pathname.startsWith('/bookings') || 
       window.location.pathname.startsWith('/listings'));
    
    return (
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href={isOnProtectedPage ? "/dashboard" : "/"} className="flex items-center flex-shrink-0">
              <Image 
                src="/images/RentitForward-Main-Logo.svg" 
                alt="Rent It Forward" 
                width={180} 
                height={48}
                className="h-8 w-auto"
                priority
              />
            </Link>
            
            {/* Loading placeholder */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // If user is authenticated, show the dashboard-style header
  if (isAuthenticated) {
    return (
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center flex-shrink-0">
              <Image 
                src="/images/RentitForward-Main-Logo.svg" 
                alt="Rent It Forward" 
                width={180} 
                height={48}
                className="h-8 w-auto"
                priority
              />
            </Link>
            
            {/* Search Bar - Center */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for items, categories or locations"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      window.location.href = `/browse?search=${encodeURIComponent(searchTerm.trim())}`;
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button 
                  onClick={() => {
                    if (searchTerm.trim()) {
                      window.location.href = `/browse?search=${encodeURIComponent(searchTerm.trim())}`;
                    }
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary p-1.5 rounded-full"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* User Actions - Right */}
            <div className="flex items-center space-x-4">
              <Link href="/listings/create" className="btn-primary hidden lg:flex items-center px-4 py-2 text-white rounded-full font-medium hover:bg-green-600 transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                Post Item
              </Link>
              
              <Link href="/notifications" className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Link>
              
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                >
                  <User className="w-5 h-5 text-white" />
                </button>
                
                {/* User Dropdown */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-2">
                      <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        Profile
                      </Link>
                      <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        Dashboard
                      </Link>
                      <Link href="/bookings" className="block px-4 py-2 text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        My Rentals
                      </Link>
                      <Link href="/listings" className="block px-4 py-2 text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        My Listings
                      </Link>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button 
                          onClick={() => {
                            signOut();
                            setIsMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // Default header for non-authenticated users
  return (
    <header className="bg-white shadow-sm border-b relative z-50">
      <nav className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image 
              src="/images/RentitForward-Main-Logo.svg" 
              alt="Rent It Forward" 
              width={240} 
              height={64}
              className="h-8 sm:h-10 lg:h-12 w-auto"
              priority
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link href="/browse" className="text-gray-700 hover:text-green-600 transition-colors font-medium">
              Browse Items
            </Link>
            <Link href="/how-it-works" className="text-gray-700 hover:text-green-600 transition-colors font-medium">
              How it Works
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-green-600 transition-colors font-medium">
              About
            </Link>
          </div>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <Link href="/login" className="text-gray-700 hover:text-green-600 font-medium transition-colors px-4 py-2">
              Login
            </Link>
            <Link href="/register" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-medium transition-colors">
              Sign Up
            </Link>
            <Link href="/listings/create" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-medium transition-colors">
              Create Listing
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t z-40">
            <div className="px-4 py-6 space-y-4">
              {/* Navigation Links */}
              <div className="space-y-4 border-b border-gray-100 pb-4">
                <Link 
                  href="/browse" 
                  className="block text-gray-700 hover:text-green-600 transition-colors font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Browse Items
                </Link>
                <Link 
                  href="/how-it-works" 
                  className="block text-gray-700 hover:text-green-600 transition-colors font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How it Works
                </Link>
                <Link 
                  href="/about" 
                  className="block text-gray-700 hover:text-green-600 transition-colors font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
              </div>
              
              {/* Auth Buttons */}
              <div className="space-y-3">
                <Link 
                  href="/login" 
                  className="block w-full text-center text-gray-700 hover:text-green-600 font-medium transition-colors py-3 border border-gray-200 rounded-lg hover:border-green-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="block w-full text-center bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link 
                  href="/listings/create" 
                  className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Create Listing
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
