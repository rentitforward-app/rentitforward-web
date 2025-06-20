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
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  price_per_day: number;
  price_weekly: number | null;
  price_hourly: number | null;
  deposit: number;
  images: string[];
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_active: boolean;
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
          price_per_day,
          price_weekly,
          price_hourly,
          deposit,
          images,
          address,
          city,
          state,
          country,
          postal_code,
          is_active,
          condition,
          brand,
          model,
          year,
          view_count,
          favorite_count,
          created_at,
          owner_id
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('📋 Query result:', { 
        dataLength: data?.length, 
        error: error,
        firstItem: data?.[0] 
      });

      if (error) {
        console.error('❌ Error fetching listings (detailed):', error);
        console.error('🔍 Error details:', JSON.stringify(error, null, 2));
        
        // Send to Sentry for monitoring
        if (typeof window !== 'undefined') {
          const Sentry = require('@sentry/nextjs');
          Sentry.captureException(new Error(`Supabase listings query failed: ${error.message || 'Unknown error'}`), {
            extra: {
              supabaseError: error,
              errorDetails: JSON.stringify(error, null, 2),
              context: 'fetchListings'
            }
          });
        }
        
        toast.error('Failed to load listings');
        return;
      }

      console.log('✅ Fetched listings successfully:', data?.length || 0);
      
      // Add fake profile data for now until we fix the join
      const enrichedListings = data?.map((listing: any) => ({
        ...listing,
        profiles: {
          full_name: 'User Name',
          avatar_url: null
        }
      })) || [];

      setListings(enrichedListings);
    } catch (error) {
      console.error('❌ Unexpected error in fetchListings:', error);
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
      return;
    }

    try {
      const isFavorited = favorites.has(listingId);
      
      if (isFavorited) {
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
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: listingId });

        if (error) throw error;
        
        setFavorites(prev => new Set([...prev, listingId]));
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
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(listing =>
        listing.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Apply state filter
    if (selectedState) {
      filtered = filtered.filter(listing =>
        listing.state === selectedState
      );
    }

    // Apply price range filter
    if (priceRange.min) {
      filtered = filtered.filter(listing =>
        listing.price_per_day >= parseFloat(priceRange.min)
      );
    }
    if (priceRange.max) {
      filtered = filtered.filter(listing =>
        listing.price_per_day <= parseFloat(priceRange.max)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.price_per_day - b.price_per_day;
        case 'price_high':
          return b.price_per_day - a.price_per_day;
        case 'popular':
          return (b.favorite_count || 0) - (a.favorite_count || 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredListings(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedState('');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
  };

  const formatPrice = (price: number) => {
    return `$${price}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categories).slice(0, 6).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(selectedCategory === key ? '' : key)}
                  className={`category-pill px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === key
                      ? 'bg-green-500 text-white selected'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.icon} {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (per day)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All States</option>
              {australianStates.map(state => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {filteredListings.length} Items Available
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* View mode toggle */}
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
        </div>
      </div>

      {/* Results Grid */}
      <div className="p-6">
        {filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No items found</p>
            <p className="text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                images={listing.images}
                price={listing.price_per_day}
                period="day"
                category={listing.category}
                owner={{
                  name: listing.profiles?.full_name || 'Anonymous',
                  avatar: listing.profiles?.avatar_url || undefined
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function BrowsePage() {
  return (
    <AuthenticatedLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <BrowseContent />
      </Suspense>
    </AuthenticatedLayout>
  );
} 