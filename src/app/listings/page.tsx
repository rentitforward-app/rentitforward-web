'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Plus, 
  Eye, 
  Edit, 
  Calendar, 
  DollarSign, 
  Package, 
  TrendingUp,
  Users,
  Star,
  MessageCircle,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Listing {
  id: string;
  title: string;
  description: string;
  daily_rate: number;
  category: string;
  images: string[];
  status: 'active' | 'paused' | 'draft';
  created_at: string;
  view_count: number;
  total_bookings: number;
  total_earnings: number;
  availability: boolean;
}

interface ItemBooking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  listing_id: string;
  listing_title: string;
  renter: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
    phone?: string;
  };
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [itemBookings, setItemBookings] = useState<ItemBooking[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'bookings' | 'earnings'>('items');
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Mock data for listings
      const mockListings: Listing[] = [
        {
          id: '1',
          title: 'Professional DSLR Camera Kit',
          description: 'Canon EOS R6 with 24-70mm lens, perfect for photography and videography.',
          daily_rate: 50,
          category: 'Photography',
          images: ['/api/placeholder/300/300'],
          status: 'active',
          created_at: '2024-10-15T10:00:00Z',
          view_count: 45,
          total_bookings: 8,
          total_earnings: 1200,
          availability: true
        },
        {
          id: '2',
          title: 'Power Drill Set with Accessories',
          description: 'Professional cordless drill with complete bit set and carrying case.',
          daily_rate: 25,
          category: 'Tools',
          images: ['/api/placeholder/300/300'],
          status: 'active',
          created_at: '2024-10-20T14:30:00Z',
          view_count: 23,
          total_bookings: 5,
          total_earnings: 375,
          availability: true
        },
        {
          id: '3',
          title: 'Camping Tent (4-Person)',
          description: 'Waterproof family tent, easy setup, perfect for weekend camping trips.',
          daily_rate: 30,
          category: 'Outdoor',
          images: ['/api/placeholder/300/300'],
          status: 'paused',
          created_at: '2024-09-10T09:15:00Z',
          view_count: 67,
          total_bookings: 12,
          total_earnings: 720,
          availability: false
        }
      ];

      // Mock data for item bookings
      const mockItemBookings: ItemBooking[] = [
        {
          id: '1',
          start_date: '2024-12-05',
          end_date: '2024-12-10',
          total_amount: 250,
          status: 'confirmed',
          created_at: '2024-11-20T10:00:00Z',
          listing_id: '1',
          listing_title: 'Professional DSLR Camera Kit',
          renter: {
            id: 'renter1',
            full_name: 'Sarah Johnson',
            email: 'sarah@example.com',
            phone: '+61 400 123 456'
          }
        },
        {
          id: '2',
          start_date: '2024-11-25',
          end_date: '2024-11-30',
          total_amount: 150,
          status: 'pending',
          created_at: '2024-11-15T14:30:00Z',
          listing_id: '2',
          listing_title: 'Power Drill Set with Accessories',
          renter: {
            id: 'renter2',
            full_name: 'Mike Chen',
            email: 'mike@example.com',
            phone: '+61 400 789 123'
          }
        }
      ];

      setListings(mockListings);
      setItemBookings(mockItemBookings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'paused':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(price);
  };

  const totalEarnings = listings.reduce((sum, listing) => sum + listing.total_earnings, 0);
  const totalBookings = listings.reduce((sum, listing) => sum + listing.total_bookings, 0);
  const averageRating = 4.7;

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-600">Manage your items and track bookings</p>
          </div>
          <Button
            onClick={() => router.push('/listings/create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-xl font-bold">{listings.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-xl font-bold">{formatPrice(totalEarnings)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-xl font-bold">{averageRating}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'items', label: 'My Items', count: listings.length },
              { key: 'bookings', label: 'Item Bookings', count: itemBookings.length },
              { key: 'earnings', label: 'Earnings' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="relative h-48">
                    <Image
                      src={listing.images[0]}
                      alt={listing.title}
                      fill
                      className="object-cover"
                    />
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(listing.status)}`}>
                      {getStatusIcon(listing.status)}
                      {listing.status}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-green-600">{formatPrice(listing.daily_rate)}/day</span>
                      <span className="text-sm text-gray-500">{listing.category}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {listing.view_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {listing.total_bookings}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatPrice(listing.total_earnings)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => router.push(`/listings/${listing.id}`)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => router.push(`/listings/${listing.id}/edit`)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {itemBookings.map((booking) => (
              <Card key={booking.id} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{booking.listing_title}</h3>
                    <p className="text-sm text-gray-600">
                      {format(new Date(booking.start_date), 'MMM dd')} - {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    {booking.status}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{booking.renter.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{formatPrice(booking.total_amount)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => window.open(`mailto:${booking.renter.email}`)}
                      variant="outline"
                      size="sm"
                    >
                      <Mail className="w-3 h-3" />
                    </Button>
                    {booking.renter.phone && (
                      <Button
                        onClick={() => window.open(`tel:${booking.renter.phone}`)}
                        variant="outline"
                        size="sm"
                      >
                        <Phone className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push(`/messages?user=${booking.renter.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarnings)}</p>
                    <p className="text-sm text-green-600">+12% from last month</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(450)}</p>
                    <p className="text-sm text-blue-600">3 completed rentals</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg per Booking</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarnings / totalBookings)}</p>
                    <p className="text-sm text-purple-600">Across {totalBookings} bookings</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Items</h3>
              <div className="space-y-4">
                {listings
                  .sort((a, b) => b.total_earnings - a.total_earnings)
                  .slice(0, 3)
                  .map((listing, index) => (
                    <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{listing.title}</p>
                          <p className="text-sm text-gray-600">{listing.total_bookings} bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPrice(listing.total_earnings)}</p>
                        <p className="text-sm text-gray-600">{formatPrice(listing.daily_rate)}/day</p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 