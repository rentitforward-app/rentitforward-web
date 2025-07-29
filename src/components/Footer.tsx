'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Twitter, Instagram } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Footer() {
  const { isAuthenticated, loading } = useAuth()

  // Don't show footer while loading
  if (loading) {
    return null;
  }

  // Don't show footer for authenticated users (dashboard has its own layout)
  if (isAuthenticated) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-6 text-lg">Rent It Forward</h4>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Share More, Buy Less. Building a sustainable community through sharing.
            </p>
            <p className="text-gray-400 text-sm mb-2">
              Address: Australia
            </p>
            <p className="text-gray-400 text-sm">
              hello@rentitforward.com.au
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link href="/about" className="hover:text-green-400 transition-colors">About Us</Link></li>
              <li><Link href="/browse" className="hover:text-green-400 transition-colors">Browse Items</Link></li>
              <li><Link href="/create-listing" className="hover:text-green-400 transition-colors">List an Item</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-lg">Support</h4>
            <ul className="space-y-3 text-gray-300">
              <li><Link href="/faq" className="hover:text-green-400 transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-green-400 transition-colors">Contact Us</Link></li>
              <li><Link href="/terms" className="hover:text-green-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-green-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-lg">Follow Us</h4>
            <div className="flex space-x-4 mb-6">
              <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
            </div>
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">Download our app:</p>
              <div className="space-y-3">
                <Link href="#" className="block">
                  <div className="bg-black rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors flex items-center space-x-3">
                    <Image 
                      src="/images/apple-store-icon.png" 
                      alt="Apple Logo" 
                      width={20} 
                      height={24}
                      className="flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-300">Download on the</span>
                      <span className="text-sm font-semibold text-white">App Store</span>
                    </div>
                  </div>
                </Link>
                <Link href="#" className="block">
                  <div className="bg-black rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors flex items-center space-x-3">
                    <Image 
                      src="/images/google-play-icon.png" 
                      alt="Google Play Logo" 
                      width={20} 
                      height={22}
                      className="flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-300">GET IT ON</span>
                      <span className="text-sm font-semibold text-white">Google Play</span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
          <p>© 2025 Rent It Forward. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 