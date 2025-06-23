'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Plus, 
  Package, 
  List, 
  MessageCircle, 
  Bell, 
  User,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

const sidebarItems = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
  },
  {
    label: 'Browse',
    href: '/browse',
    icon: Search,
  },
  {
    label: 'Post Item',
    href: '/listings/create',
    icon: Plus,
  },
  {
    label: 'My Bookings',
    href: '/bookings',
    icon: Package,
  },
  {
    label: 'My Listings',
    href: '/dashboard?tab=listings',
    icon: List,
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: MessageCircle,
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      'w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col',
      className
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center">
          <div className="text-2xl font-bold text-primary-500">
            Rent It Forward
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group',
                active
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 mr-3 transition-colors',
                active ? 'text-primary-600' : 'text-gray-500 group-hover:text-primary-500'
              )} />
              <span className="flex-1">{item.label}</span>
              {active && (
                <ChevronRight className="w-4 h-4 text-primary-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section (if needed) */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center px-4 py-3 text-sm text-gray-600">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">John Anderson</div>
            <div className="text-xs text-gray-500">San Francisco, CA</div>
          </div>
        </div>
      </div>
    </aside>
  );
} 