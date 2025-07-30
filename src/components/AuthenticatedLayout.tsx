'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Compass, 
  Plus, 
  Package2, 
  Calendar, 
  MessageCircle, 
  Menu,
  X,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  Heart
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-hot-toast';
import NotificationBadge from './NotificationBadge';
import ProfileAvatar from './ProfileAvatar';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: any;
}

const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/browse', label: 'Browse Items', icon: Compass },
  { href: '/favorites', label: 'Saved Items', icon: Heart },
  { href: '/bookings', label: 'My Bookings', icon: Package2 },
  { href: '/listings', label: 'My Listings', icon: Calendar },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
];

const bottomNavigationItems = [
  { href: '/help', label: 'Help & Support', icon: HelpCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center">
          <Image 
            src="/images/RentitForward-Main-Logo.svg" 
            alt="Rent It Forward" 
            width={160} 
            height={40}
            className="h-8 w-auto brightness-0 invert"
            priority
          />
        </Link>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  active
                    ? 'text-white bg-gray-700'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-gray-700 space-y-1">
          {bottomNavigationItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                  active
                    ? 'text-white bg-gray-700'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
          
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gray-800 border-r border-gray-700">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar */}
        <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transition-transform duration-300`}>
          {/* Mobile close button */}
          <div className="flex justify-end p-4 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <SidebarContent />
        </aside>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left side - Menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Center - Logo */}
              <Link href="/dashboard" className="flex items-center">
                <Image 
                  src="/images/RentitForward-Main-Logo.svg" 
                  alt="Rent It Forward" 
                  width={160} 
                  height={40}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
              
              {/* Right side - User Profile */}
              <div className="flex items-center space-x-3">
                <Link href="/notifications" className="p-2 text-gray-500 hover:text-gray-700">
                  <NotificationBadge />
                </Link>
                <ProfileAvatar size="sm" />
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for items, categories or locations"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchTerm.trim()) {
                        router.push(`/browse?search=${encodeURIComponent(searchTerm.trim())}`);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4 ml-6">
                <Link href="/listings/create" className="btn-primary flex items-center px-4 py-2 text-white rounded-lg font-medium hover:bg-green-600 transition-colors">
                  <Plus className="w-4 h-4 mr-2" />
                  Post Item
                </Link>
                
                <Link href="/notifications" className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                  <NotificationBadge />
                </Link>
                
                <ProfileAvatar />
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 