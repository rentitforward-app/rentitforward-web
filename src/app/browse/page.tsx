'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, MapPin, Heart, Star, Calendar, Grid, List, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ListingCard from '@/components/ui/ListingCard';

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
  'Tools & DIY': { label: 'Tools & DIY', icon: '🔧' },
  'Electronics': { label: 'Electronics', icon: '📱' },
  'Cameras': { label: 'Cameras', icon: '📷' },
  'Sports & Outdoors': { label: 'Sports & Outdoors', icon: '🏃' },
  'Event & Party': { label: 'Event & Party', icon: '🎉' },
  'Instruments': { label: 'Instruments', icon: '🎸' },
  'Automotive': { label: 'Automotive', icon: '🚗' },
  'Home & Garden': { label: 'Home & Garden', icon: '🏡' },
  'Appliances': { label: 'Appliances', icon: '🔌' },
  'Other': { label: 'Other', icon: '📦' }
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    console.log('🚀 BrowseContent component mounted, starting initial data fetch...');
    console.log('📍 Search params:', { 
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      state: searchParams.get('state')
    });
    
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
      console.log('🔍 Starting to fetch listings...');
      console.log('📡 Supabase client initialized:', !!supabase);
      
      // Test basic connection first
      const { data: testData, error: testError } = await supabase
        .from('listings')
        .select('count', { count: 'exact', head: true });
      
      console.log('📊 Database connection test:', { count: testData, error: testError });
      
      // Simplified query without joins for now - select only existing columns
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          category,
          daily_rate,
          weekly_rate,
          monthly_rate,
          deposit_amount,
          images,
          location,
          state,
          postcode,
          is_available,
          condition,
          brand,
          model,
          year,
          view_count,
          favorite_count,
          created_at,
          owner_id
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      console.log('📋 Query result:', { 
        dataLength: data?.length, 
        error: error,
        firstItem: data?.[0] 
      });

      if (error) {
        console.error('❌ Error fetching listings (detailed):', error);
        console.error('🔍 Error details:', JSON.stringify(error, null, 2));
        toast.error('Failed to load listings');
        return;
      }

      console.log('✅ Fetched listings successfully:', data?.length || 0);
      
      // Add fake profile data for now until we fix the join
      const listingsWithProfiles = data?.map(listing => ({
        ...listing,
        subcategory: null, // Add this since the interface expects it
        profiles: {
          full_name: 'Property Owner',
          avatar_url: null
        }
      })) || [];
      
      console.log('🎯 Setting listings in state:', listingsWithProfiles.length);
      setListings(listingsWithProfiles);
    } catch (error) {
      console.error('💥 Error fetching listings (catch):', error);
      console.error('🔍 Error type:', typeof error);
      console.error('🔍 Error string:', String(error));
      toast.error('Failed to load listings');
    } finally {
      console.log('🏁 Setting loading to false');
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

        setFavorites(prev => new Set(prev).add(listingId));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(term) ||
        listing.description.toLowerCase().includes(term) ||
        listing.category.toLowerCase().includes(term) ||
        listing.location.toLowerCase().includes(term) ||
        listing.brand?.toLowerCase().includes(term) ||
        listing.model?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }

    // Apply state filter
    if (selectedState) {
      filtered = filtered.filter(listing => listing.state === selectedState);
    }

    // Apply price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(listing => {
        const price = listing.daily_rate;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.daily_rate - b.daily_rate);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.daily_rate - a.daily_rate);
        break;
      case 'popular':
        filtered.sort((a, b) => (b.favorite_count + b.view_count) - (a.favorite_count + a.view_count));
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
      currency: 'AUD'
    }).format(price);
  };

  const hasActiveFilters = selectedCategory || selectedState || searchTerm || priceRange.min || priceRange.max;

  // Debug output for render
  console.log('🎨 BrowseContent render:', {
    isLoading,
    listings: listings.length,
    filteredListings: filteredListings.length,
    hasActiveFilters,
    searchTerm,
    selectedCategory,
    selectedState,
    priceRange
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow h-80"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title and Results Count */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Browse Items</h1>
              <p className="text-gray-600 mt-1">
                {filteredListings.length} item{filteredListings.length !== 1 ? 's' : ''} available
                {hasActiveFilters && ' (filtered)'}
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search items, categories, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-80 shrink-0">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
            </div>

            {/* Filters Panel */}
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-green-600 hover:text-green-700"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Category
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="category"
                          value=""
                          checked={selectedCategory === ''}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm">All Categories</span>
                      </label>
                      {Object.entries(categories).map(([key, category]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="radio"
                            name="category"
                            value={key}
                            checked={selectedCategory === key}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="text-green-600 focus:ring-green-500"
                          />
                          <span className="ml-2 text-sm">
                            {category.icon} {category.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      State
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">All States</option>
                      {australianStates.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Daily Rate
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceRange.min}
                          onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange.max}
                          onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or browse different categories.
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                : 'space-y-4'
              }>
                                 {filteredListings.map((listing) => (
                   <ListingCard
                     key={listing.id}
                     id={listing.id}
                     title={listing.title}
                     images={listing.images}
                     price={listing.daily_rate}
                     period="day"
                     rating={4.5} // TODO: Calculate from reviews
                     reviewCount={12} // TODO: Get from reviews
                     category={categories[listing.category as keyof typeof categories]?.label || listing.category}
                     owner={{
                       name: listing.profiles.full_name,
                       avatar: listing.profiles.avatar_url || undefined,
                     }}
                   />
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
} 