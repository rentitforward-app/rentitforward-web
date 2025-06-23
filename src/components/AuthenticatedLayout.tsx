'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Compass, 
  Plus, 
  Package2, 
  Calendar, 
  MessageCircle, 
  Bell, 
  User,
  Menu,
  X
} from 'lucide-react';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/listings/create', label: 'Post Item', icon: Plus },
  { href: '/bookings', label: 'My Bookings', icon: Package2 },
  { href: '/listings', label: 'My Listings', icon: Calendar },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 w-64 h-full bg-white border-r border-gray-200 transition-transform duration-300`}>
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-4">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href === '/listings' && pathname.startsWith('/listings')) ||
                (item.href === '/bookings' && pathname.startsWith('/bookings'));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'text-gray-900 bg-gray-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          {/* Mobile menu button */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
} 