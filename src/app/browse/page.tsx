'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, MapPin, Heart, Star, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  deposit_amount: number;
  images: string[];
  location: string;
  state: string;
  postcode: string;
  is_available: boolean;
  condition: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  view_count: number;
  favorite_count: number;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const categories = {
  'tools-diy': { label: 'Tools & DIY', icon: '🔧' },
  'electronics': { label: 'Electronics', icon: '📱' },
  'cameras': { label: 'Cameras', icon: '📷' },
  'sports-outdoors': { label: 'Sports & Outdoors', icon: '🏃' },
  'event-party': { label: 'Event & Party', icon: '🎉' },
  'instruments': { label: 'Instruments', icon: '🎸' },
  'automotive': { label: 'Automotive', icon: '🚗' },
  'home-garden': { label: 'Home & Garden', icon: '🏡' },
  'appliances': { label: 'Appliances', icon: '🔌' },
  'other': { label: 'Other', icon: '📦' }
};

const australianStates = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' }
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

function BrowseContent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    fetchListings();
    
    // Get initial search params
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const state = searchParams.get('state');
    
    if (category) setSelectedCategory(category);
    if (search) setSearchTerm(search);
    if (state) setSelectedState(state);
  }, [searchParams]);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchTerm, selectedCategory, selectedState, priceRange, sortBy]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:owner_id (
            full_name,
            avatar_url
          )
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listings:', error);
        toast.error('Failed to load listings');
        return;
      }

      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      const favoriteIds = new Set(data?.map(fav => fav.listing_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error('Please log in to save favorites');
      router.push('/login');
      return;
    }

    try {
      if (favorites.has(listingId)) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);

        if (error) throw error;

        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(listingId);
          return newFavorites;
        });

        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            listing_id: listingId
          });

        if (error) throw error;

        setFavorites(prev => new Set([...prev, listingId]));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchLower) ||
        listing.description.toLowerCase().includes(searchLower) ||
        listing.category.toLowerCase().includes(searchLower) ||
        listing.subcategory?.toLowerCase().includes(searchLower) ||
        listing.brand?.toLowerCase().includes(searchLower) ||
        listing.model?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }

    // State filter
    if (selectedState) {
      filtered = filtered.filter(listing => listing.state === selectedState);
    }

    // Price range filter
    if (priceRange.min) {
      filtered = filtered.filter(listing => listing.daily_rate >= parseInt(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(listing => listing.daily_rate <= parseInt(priceRange.max));
    }

    // Sort
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.daily_rate - b.daily_rate);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.daily_rate - a.daily_rate);
        break;
      case 'popular':
        filtered.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredListings(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedState('');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
    router.push('/browse');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search and Filters Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search for tools, electronics, cameras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                  >
                    <option value="">All Categories</option>
                    {Object.entries(categories).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                  >
                    <option value="">All States</option>
                    {australianStates.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Rate
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-[#44D62C] bg-white border border-[#44D62C] rounded-md hover:bg-[#44D62C] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {filteredListings.length} {filteredListings.length === 1 ? 'item' : 'items'} available
          </h1>
        </div>

        {/* Listings Grid */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <Link href={`/listings/${listing.id}`}>
                    <div className="aspect-w-4 aspect-h-3 relative h-48">
                      <Image
                        src={listing.images[0] || '/placeholder-item.jpg'}
                        alt={listing.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </Link>
                  
                  {/* Favorite Button */}
                  <button
                    onClick={() => toggleFavorite(listing.id)}
                    className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white/90 transition-colors"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites.has(listing.id)
                          ? 'text-red-500 fill-current'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>

                  {/* Category Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#44D62C] text-white">
                      {categories[listing.category as keyof typeof categories]?.label}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <Link href={`/listings/${listing.id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-[#44D62C] cursor-pointer mb-2">
                      {listing.title}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {listing.location}, {listing.state}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-[#44D62C]">
                      {formatPrice(listing.daily_rate)}/day
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                      <span className="mr-2">4.8</span>
                      <span>({listing.view_count} views)</span>
                    </div>
                  </div>

                  {listing.brand && (
                    <div className="mt-2 text-sm text-gray-600">
                      {listing.brand} {listing.model}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search terms
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
} 