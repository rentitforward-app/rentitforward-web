'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search,
  Bell,
  Plus,
  Home,
  Compass,
  Package2,
  Calendar,
  MessageCircle,
  User,
  Settings,
  ChevronDown,
  SlidersHorizontal,
  Grid3X3,
  List,
  Heart,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Note: Design system colors are applied via CSS classes

interface Listing {
  id: string;
  title: string;
  images: string[];
  price_per_day: number;
  price_weekly?: number;
  is_active: boolean;
  view_count: number;
  favorite_count: number;
  created_at: string;
  category: string;
  state: string;
  address: string;
  city: string;
  postal_code: string;
  rating?: number;
  review_count?: number;
  distance?: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const categories = {
  'Tools': { label: '🔧 Tools', icon: '🔧' },
  'Electronics': { label: '📱 Electronics', icon: '📱' },
  'Cameras': { label: '📷 Cameras', icon: '📷' },
  'Outdoors': { label: '🏕️ Outdoors', icon: '🏕️' },
  'Event': { label: '🎉 Event', icon: '🎉' },
  'Cleaning': { label: '🧹 Cleaning', icon: '🧹' },
};

function DashboardContent() {
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [selectedDay, setSelectedDay] = useState('Today');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hasPickup, setHasPickup] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const itemsPerPage = 6;
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedListings = filteredListings.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    checkUser();
    fetchListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, selectedCategories, priceRange, selectedRating]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
      toast.error('Failed to authenticate');
    }
  };

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          images,
          price_per_day,
          price_weekly,
          is_active,
          view_count,
          favorite_count,
          created_at,
          category,
          state,
          address,
          city,
          postal_code
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listings:', error);
        toast.error('Failed to load listings');
        return;
      }

      // Add mock data for design completeness
      const enrichedListings = data.map((listing: any) => ({
        ...listing,
        rating: 4.0 + Math.random() * 1.0, // Random rating between 4.0-5.0
        review_count: Math.floor(Math.random() * 50) + 10, // Random reviews 10-60
        distance: `${(Math.random() * 10 + 1).toFixed(1)} km away`,
        profiles: {
          full_name: 'User Name',
          avatar_url: null
        }
      }));

      setListings(enrichedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = listings;

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(listing => 
        selectedCategories.some(cat => listing.category.toLowerCase().includes(cat.toLowerCase()))
      );
    }

    // Price range filter
    filtered = filtered.filter(listing => 
      listing.price_per_day >= priceRange[0] && listing.price_per_day <= priceRange[1]
    );

    // Rating filter
    if (selectedRating) {
      filtered = filtered.filter(listing => 
        (listing.rating || 0) >= selectedRating
      );
    }

    setFilteredListings(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setPriceRange([0, 200]);
    setSelectedRating(null);
    setHasPickup(false);
    setHasDelivery(false);
  };

  const formatPrice = (price: number) => {
    return `$${price}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary p-1.5 rounded-full">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* User Actions - Right */}
            <div className="flex items-center space-x-4">
              <button className="btn-primary hidden lg:flex items-center px-4 py-2 text-white rounded-full font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Post Item
              </button>
              
              <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              
              {/* Mobile menu button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                <SlidersHorizontal className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 w-64 h-full bg-white border-r border-gray-200 transition-transform duration-300`}>
          <nav className="p-6 space-y-2">
            <Link href="/dashboard" className="flex items-center px-4 py-3 text-gray-900 bg-gray-100 rounded-lg font-medium">
              <Home className="w-5 h-5 mr-3" />
              Home
            </Link>
            <Link href="/browse" className="flex items-center px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <Compass className="w-5 h-5 mr-3" />
              Browse
            </Link>
            <Link href="/listings/create" className="flex items-center px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <Plus className="w-5 h-5 mr-3" />
              Post Item
            </Link>
            <Link href="/bookings" className="flex items-center px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <Package2 className="w-5 h-5 mr-3" />
              My Rentals
            </Link>
            <Link href="/listings" className="flex items-center px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <Calendar className="w-5 h-5 mr-3" />
              My Listings
            </Link>
            <Link href="/messages" className="flex items-center px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <MessageCircle className="w-5 h-5 mr-3" />
              Messages
            </Link>
            <Link href="/notifications" className="flex items-center px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell className="w-5 h-5 mr-3" />
              Notifications
            </Link>
            <Link href="/profile" className="flex items-center px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <User className="w-5 h-5 mr-3" />
              Profile
            </Link>
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
          {/* Mobile Search */}
          <div className="lg:hidden p-4 bg-white border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button 
                onClick={clearFilters}
                className="text-green-500 hover:text-green-600 font-medium transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(categories).map(([key, category]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(key)}
                        onChange={() => toggleCategory(key)}
                        className="sr-only"
                      />
                      <div className={`category-pill flex items-center px-3 py-2 rounded-lg border cursor-pointer ${
                        selectedCategories.includes(key)
                          ? 'selected'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}>
                        <span className="text-xs mr-1">{category.icon}</span>
                        <span className="text-sm">{key}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Price Range (per day)</h3>
                <div className="px-3">
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #44D62C 0%, #44D62C ${(priceRange[1] / 200) * 100}%, #E5E7EB ${(priceRange[1] / 200) * 100}%, #E5E7EB 100%)`
                    }}
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>$0</span>
                    <span>${priceRange[1]}+</span>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Availability</h3>
                <div className="flex space-x-2">
                  {['Today', 'This Week', 'Custom'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedDay(option)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedDay === option
                          ? 'btn-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Distance</h3>
                <div className="px-3">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    defaultValue="25"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>0 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>
              </div>

              {/* Minimum Rating */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Minimum Rating</h3>
                <div className="flex space-x-2">
                  {[4, 3].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedRating === rating
                          ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-yellow-400 mr-1">★</span>
                      {rating}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup/Delivery */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Pickup/Delivery</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={hasPickup}
                      onChange={(e) => setHasPickup(e.target.checked)}
                      className="w-4 h-4 text-green-500 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Pickup Available</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={hasDelivery}
                      onChange={(e) => setHasDelivery(e.target.checked)}
                      className="w-4 h-4 text-green-500 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Delivery Available</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Results Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Showing {filteredListings.length} results
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <select 
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  defaultValue="recommended"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>

                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${viewMode === 'grid' ? 'btn-primary text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${viewMode === 'list' ? 'btn-primary text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <MapPin className="w-4 h-4 mr-2" />
                  Map
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="p-6">
            {paginatedListings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Package2 className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-600">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {paginatedListings.map((listing) => (
                  <div key={listing.id} className="product-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-gray-200">
                      {listing.images && listing.images.length > 0 ? (
                        <Image
                          src={listing.images[0]}
                          alt={listing.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package2 className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow">
                        <Heart className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 truncate">{listing.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{listing.category} • {listing.distance}</p>
                      
                      <div className="flex items-center mb-3">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-900 ml-1">
                            {listing.rating?.toFixed(1) || '4.8'}
                          </span>
                          <span className="text-sm text-gray-600 ml-1">
                            ({listing.review_count || '24'} reviews)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(listing.price_per_day)}
                          </span>
                          <span className="text-sm text-gray-600">/day</span>
                        </div>
                        
                        <button className="btn-primary px-4 py-2 text-white text-sm font-medium rounded-full">
                          View & Rent
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-8">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? 'btn-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}