'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
