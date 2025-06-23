'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, MapPin, Heart, Star, Calendar, Grid, List, X, ChevronDown, Map } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ListingCard from '@/components/ui/ListingCard';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import MapView from '@/components/ui/MapView';

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
  { value: 'distance', label: 'Distance' },
];

function BrowseContent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [paginatedListings, setPaginatedListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination constants
  const ITEMS_PER_PAGE = 24;
  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);

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
    
    if (category) setSelectedCategories([category]);
    if (search) setSearchTerm(search);
    if (state) setSelectedState(state);
  }, [searchParams]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchTerm, selectedCategories, selectedState, priceRange, sortBy]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  // Handle pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedListings(filteredListings.slice(startIndex, endIndex));
  }, [filteredListings, currentPage, ITEMS_PER_PAGE]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategories, selectedState, priceRange, sortBy]);

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
          profiles!listings_owner_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      console.log('✅ Raw Supabase response:', { 
        data: data?.length ? `${data.length} items` : 'No data', 
        error: error ? error.message : 'No error',
        sampleData: data?.[0]
      });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw new Error(`Supabase listings query failed: ${error.message}`);
      }

      if (!data) {
        console.warn('⚠️ No listings data returned');
        setListings([]);
        return;
      }

      console.log('🎯 Setting listings:', data.length);
      setListings(data as Listing[]);
    } catch (error) {
      console.error('💥 Error in fetchListings:', error);
      
      // Capture error in Sentry with more context
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error, {
          contexts: {
            fetchListings: {
              supabaseClient: !!supabase,
              timestamp: new Date().toISOString(),
            }
          }
        });
      }
      
      // Mock data fallback for development
      console.log('🔄 Using mock data as fallback...');
      const mockListings: Listing[] = [];
      setListings(mockListings);
    } finally {
      console.log('🏁 fetchListings completed');
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
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(listing =>
        selectedCategories.some(category => 
          listing.category.toLowerCase() === category.toLowerCase()
        )
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
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.price_per_day - b.price_per_day);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price_per_day - a.price_per_day);
        break;
      case 'popular':
        filtered.sort((a, b) => (b.favorite_count || 0) - (a.favorite_count || 0));
        break;
      case 'distance':
        if (userLocation) {
          filtered.sort((a, b) => {
            const distanceA = getMockListingData(a.id).distance;
            const distanceB = getMockListingData(b.id).distance;
            return distanceA - distanceB;
          });
        } else {
          // Fallback to newest if no location
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
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
    setSelectedCategories([]);
    setSelectedState('');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
  };

  const formatPrice = (price: number) => {
    return `$${price}`;
  };

  // Helper function to generate consistent mock data based on listing ID
  const getMockListingData = (listingId: string) => {
    // Use listing ID to generate consistent but varied mock data
    const hash = listingId.split('-').reduce((acc, part) => {
      return acc + part.charCodeAt(0);
    }, 0);
    
    return {
      rating: Math.max(3.0, Math.min(5.0, 3.0 + (hash % 100) / 50)), // Rating between 3.0-5.0
      reviewCount: Math.max(1, (hash % 50) + 1), // Reviews between 1-50
      distance: Math.max(0.5, Math.min(25.0, (hash % 250) / 10)) // Distance between 0.5-25.0 km
    };
  };

  // Pagination functions
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of results
      const resultsSection = document.querySelector('[data-results-section]');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);
      
      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) {
          pageNumbers.push('...');
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push('...');
        }
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Geolocation functions
  const requestUserLocation = async () => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser.');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setLocationPermission('granted');
      
      // Sort by distance when location is available
      if (sortBy === 'distance') {
        filterAndSortListings();
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      setLocationPermission('denied');
    }
  };

  const handleNearMeClick = () => {
    if (locationPermission === 'granted' && userLocation) {
      // Already have location, just sort by distance
      setSortBy('distance');
    } else {
      // Request location permission
      requestUserLocation();
    }
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
          <div className="relative" ref={categoryDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-left flex items-center justify-between"
            >
              <span className="text-gray-700">
                {selectedCategories.length === 0 
                  ? 'Select categories...' 
                  : selectedCategories.length === 1 
                    ? (categories[selectedCategories[0] as keyof typeof categories]?.label || selectedCategories[0])
                    : `${selectedCategories.length} categories selected`
                }
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showCategoryDropdown && (
              <div className="category-dropdown absolute z-10 mt-1 w-full bg-white">
                {Object.entries(categories).map(([key, category]) => (
                  <label key={key} className="category-dropdown-item flex items-center px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories(prev => [...prev, key]);
                        } else {
                          setSelectedCategories(prev => prev.filter(cat => cat !== key));
                        }
                      }}
                      className="mr-3 h-4 w-4 text-green-500 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="flex items-center text-sm text-gray-700">
                      <span className="mr-2">{category.icon}</span>
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
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
      <div className="bg-white border-b border-gray-200 px-6 py-4" data-results-section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {filteredListings.length} Items Available
            </h1>
            {totalPages > 1 && (
              <span className="text-sm text-gray-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)} of {filteredListings.length}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Near Me button */}
            <button
              onClick={handleNearMeClick}
              disabled={sortBy === 'distance' && userLocation}
              className={`px-3 py-2 border rounded-lg flex items-center space-x-2 transition-colors ${
                sortBy === 'distance' && userLocation
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Near Me</span>
            </button>

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
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 ${viewMode === 'map' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Map className="w-4 h-4" />
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
        ) : viewMode === 'map' ? (
          <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-200">
            <MapView
              listings={filteredListings.map((listing) => {
                const mockData = getMockListingData(listing.id);
                return {
                  ...listing,
                  rating: mockData.rating,
                  reviewCount: mockData.reviewCount,
                  distance: mockData.distance,
                };
              })}
              userLocation={userLocation}
              onFavoriteToggle={toggleFavorite}
              favorites={favorites}
            />
          </div>
        ) : (
          <>
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {paginatedListings.map((listing) => {
                const mockData = getMockListingData(listing.id);
                return (
                  <ListingCard
                    key={listing.id}
                    id={listing.id}
                    title={listing.title}
                    images={listing.images}
                    price={listing.price_per_day}
                    period="day"
                    category={listing.category}
                    rating={mockData.rating}
                    reviewCount={mockData.reviewCount}
                    distance={mockData.distance}
                    owner={{
                      name: listing.profiles?.full_name || 'Anonymous',
                      avatar: listing.profiles?.avatar_url || undefined
                    }}
                  />
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-8 space-x-2">
                {/* Previous button */}
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg border ${
                    currentPage === 1
                      ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {getPageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNum === 'number' ? goToPage(pageNum) : undefined}
                    disabled={pageNum === '...'}
                    className={`px-3 py-2 rounded-lg border ${
                      pageNum === currentPage
                        ? 'border-green-500 bg-green-500 text-white'
                        : pageNum === '...'
                        ? 'border-transparent text-gray-400 cursor-default'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                
                {/* Next button */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg border ${
                    currentPage === totalPages
                      ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
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