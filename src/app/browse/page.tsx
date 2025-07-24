'use client';

// Google Maps types declaration
declare global {
  interface Window {
    google: any;
  }
}

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
import { useAuth } from '@/hooks/use-auth';

// Import existing formatting utilities for distance calculation  
import { calculateDistance as calculateDistanceUtil, formatDistance } from '@/shared/utils/formatting';

// Define coordinate types locally until shared package is properly set up
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
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
  delivery_available: boolean;
  pickup_available: boolean;
  is_active: boolean;
  condition: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  created_at: string;
  rating?: number | null;
  review_count?: number | null;
  location?: string; // PostGIS geography field
  coordinates?: Coordinates; // Parsed coordinates
  distance?: number; // Calculated distance from user
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

  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  // Location search states
  const [appLocation, setAppLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    type: 'default' | 'manual' | 'real';
    timestamp?: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      const savedLocation = localStorage.getItem('rentitforward-app-location');
      if (savedLocation) {
        return JSON.parse(savedLocation);
      }
    }
    return {
      lat: -33.8688, // Default Sydney coordinates
      lng: 151.2093,
      address: 'Sydney, NSW, Australia',
      type: 'default'
    };
  });
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Location search functions
  const handleLocationSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocationSearchTerm(value);
    
    if (value.length > 2) {
      getLocationSuggestions(value);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  const getLocationSuggestions = async (input: string) => {
    setIsSearchingLocation(true);
    try {
      // Load Google Maps API if not already loaded
      await loadGoogleMaps();
      
      if (window.google && window.google.maps && window.google.maps.places) {
        const service = new window.google.maps.places.AutocompleteService();
        
        service.getPlacePredictions({
          input: input,
          componentRestrictions: { country: 'au' },
          types: ['(cities)']
        }, (predictions: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setLocationSuggestions(predictions);
            setShowLocationSuggestions(true);
          } else {
            setLocationSuggestions([]);
            setShowLocationSuggestions(false);
          }
        });
      }
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectLocationSuggestion = async (suggestion: any) => {
    setLocationSearchTerm(suggestion.description);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    
    try {
      const coordinates = await getPlaceCoordinates(suggestion.place_id);
      if (coordinates) {
        const newLocation = {
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: suggestion.description,
          type: 'manual' as const,
          timestamp: Date.now()
        };
        setAppLocation(newLocation);
      }
    } catch (error) {
      console.error('Error getting coordinates for suggestion:', error);
    }
  };

  const loadGoogleMaps = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });
  };

  const getPlaceCoordinates = (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places) {
        resolve(null);
        return;
      }
      
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({
        placeId: placeId,
        fields: ['geometry']
      }, (place: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          resolve({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
  };

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
  }, [listings, searchTerm, selectedCategories, priceRange, sortBy, appLocation]);

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
  }, [searchTerm, selectedCategories, priceRange, sortBy, appLocation]);

  // Save appLocation to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rentitforward-app-location', JSON.stringify(appLocation));
    }
  }, [appLocation]);

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
      
      // Query with location field - use optimized function for distance sorting if user location available
      let data, error;
      
      if (userLocation && typeof userLocation === 'object' && 'lat' in userLocation && sortBy === 'distance') {
        console.log('🗺️ Using optimized distance-based query');
        
        // Use the optimized database function for distance-based queries
        const { data: functionData, error: functionError } = await supabase
          .rpc('get_listings_sorted_by_distance', {
            center_lat: userLocation.lat,
            center_lng: userLocation.lng,
            category_filter: null, // We'll filter on the client for now
            min_price: null,
            max_price: null,
            max_results: 500
          });
        
        data = functionData;
        error = functionError;
        
        console.log('🎯 Distance query result:', { count: data?.length, error: error?.message });
        
        // Transform the function result to match expected format
        if (data) {
          data = data.map((item: any) => ({
            ...item,
            profiles: {
              full_name: item.owner_name,
              avatar_url: item.owner_avatar
            },
            // Add distance for display
            distance_km: item.distance_km
          }));
        }
      } else {
        console.log('📋 Using standard query');
        
        // Standard query without distance optimization
        const { data: standardData, error: standardError } = await supabase
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
            delivery_available,
            pickup_available,
            is_active,
            condition,
            brand,
            model,
            year,
            created_at,
            rating,
            review_count,
            location,
            profiles!listings_owner_id_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        data = standardData;
        error = standardError;
      }
      
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
      
      // Parse location coordinates from PostGIS format
      const listingsWithCoordinates = (data as unknown as Listing[]).map(listing => {
        if (listing.location) {
          // Parse PostGIS POINT format: "POINT(longitude latitude)"
          const match = listing.location.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
          if (match) {
            const longitude = parseFloat(match[1]);
            const latitude = parseFloat(match[2]);
            return {
              ...listing,
              coordinates: { latitude, longitude }
            };
          }
        }
        return listing;
      });
      
      setListings(listingsWithCoordinates);
    } catch (error) {
      console.error('💥 Error in fetchListings:', error);
      
      // Capture error in Sentry with more context
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
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
        // Sort by review count instead of favorite count
        filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      case 'distance':
        if (userLocation && typeof userLocation === 'object' && 'lat' in userLocation) {
          // Calculate distance for each listing and sort by distance
          const listingsWithDistance = filtered.map(listing => {
            if (listing.coordinates) {
              const distance = calculateDistanceUtil(
                userLocation.lat,
                userLocation.lng,
                listing.coordinates.latitude,
                listing.coordinates.longitude
              );
              return { ...listing, distance };
            }
            return { ...listing, distance: Infinity }; // Put listings without coordinates at the end
          });
          
          filtered = listingsWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
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
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
  };

  const formatPrice = (price: number) => {
    return `$${price}`;
  };

  // Distance calculation - to be implemented with proper geolocation
  const calculateDistance = (listingId: string) => {
    // For now, return 0 as distance calculation requires geolocation implementation
    return 0;
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
    if ('geolocation' in navigator) {
      setIsSearchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Get reverse geocoded address
          getReverseGeocodedAddress(coords.lat, coords.lng).then((friendlyAddress) => {
            const realLocation = {
              lat: coords.lat,
              lng: coords.lng,
              address: friendlyAddress || `Your Current Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
              type: 'real' as const,
              timestamp: Date.now()
            };
            setAppLocation(realLocation);
            setLocationSearchTerm(''); // Clear search input when using real location
            setSortBy('distance'); // Set sort to distance when real location is used
            toast.success('Using your current location');
          }).catch(() => {
            const realLocation = {
              lat: coords.lat,
              lng: coords.lng,
              address: `Your Current Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
              type: 'real' as const,
              timestamp: Date.now()
            };
            setAppLocation(realLocation);
            setLocationSearchTerm('');
            setSortBy('distance');
            toast.success('Using your current location');
          });
          
          setIsSearchingLocation(false);
        },
        (error) => {
          setIsSearchingLocation(false);
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please check permissions.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  const getReverseGeocodedAddress = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const { suburb, city, town, state, postcode } = data.address;
        const location = suburb || city || town || 'Unknown Location';
        const stateCode = state || '';
        return `${location}${stateCode ? `, ${stateCode}` : ''}`;
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
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
      <div className="bg-white border-b border-gray-200 p-4 md:p-6">
        {/* Mobile Filter Toggle & Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Filters</h2>
            {/* Mobile Toggle Button */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors relative"
            >
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                {showMobileFilters ? 'Hide' : 'Show'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
              {/* Active filters indicator */}
              {(searchTerm || selectedCategories.length > 0 || priceRange.min || priceRange.max) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </button>
          </div>
          <button 
            onClick={clearFilters}
            className="text-green-500 hover:text-green-600 font-medium transition-colors text-sm md:text-base"
          >
            Clear all
          </button>
        </div>

        {/* Filters Content - Collapsible on Mobile */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          showMobileFilters 
            ? 'max-h-screen opacity-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6' 
            : 'max-h-0 opacity-0 md:max-h-screen md:opacity-100 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 lg:gap-6'
        }`}>
          {/* Search */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm md:text-base"
              />
            </div>
          </div>

          {/* Location */}
          <div className="relative">
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              Location (Search)
            </label>
            <div className="relative">
              <button
                onClick={handleNearMeClick}
                disabled={isSearchingLocation}
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 p-0 transition-colors z-10 ${
                  appLocation?.type === 'real'
                    ? 'text-green-600 hover:text-green-700'
                    : 'text-gray-400 hover:text-blue-600'
                } disabled:text-gray-400 disabled:cursor-not-allowed`}
                title={
                  appLocation?.type === 'real'
                    ? 'Using your real location - click to refresh'
                    : 'Click to use your current location'
                }
                type="button"
              >
                <MapPin className={`w-4 h-4 ${appLocation?.type === 'real' ? 'fill-current' : ''}`} />
              </button>
              <input
                type="text"
                placeholder="Search city or address..."
                value={locationSearchTerm || ''}
                onChange={handleLocationSearch}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (locationSuggestions.length > 0) {
                      selectLocationSuggestion(locationSuggestions[0]);
                    }
                  }
                }}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm md:text-base"
                disabled={isSearchingLocation}
              />
              <button
                onClick={() => {
                  setLocationSearchTerm('');
                  setLocationSuggestions([]);
                  setShowLocationSuggestions(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {isSearchingLocation ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {/* Location Suggestions Dropdown */}
            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {locationSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.place_id || index}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => selectLocationSuggestion(suggestion)}
                  >
                    <div className="text-sm text-gray-900">{suggestion.description}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Current Location Display */}
            {appLocation && (
              <div className="mt-2 text-xs text-gray-600">
                Current: {appLocation.address}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="relative" ref={categoryDropdownRef}>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Categories</label>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-left flex items-center justify-between text-sm md:text-base"
            >
              <span className="text-gray-700 truncate">
                {selectedCategories.length === 0 
                  ? 'Select categories...' 
                  : selectedCategories.length === 1 
                    ? (categories[selectedCategories[0] as keyof typeof categories]?.label || selectedCategories[0])
                    : `${selectedCategories.length} categories selected`
                }
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
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
                      className="mr-3 h-4 w-4 text-green-500 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                    />
                    <span className="flex items-center text-xs md:text-sm text-gray-700">
                      <span className="mr-2">{category.icon}</span>
                      <span className="break-words">{category.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Price Range (per day)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm md:text-base"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm md:text-base"
              />
            </div>
          </div>


        </div>
      </div>

      {/* Results Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4" data-results-section>
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
            <div className="flex items-center space-x-2 md:space-x-4">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                {filteredListings.length} Items Available
              </h1>
              {totalPages > 1 && (
                <span className="text-xs md:text-sm text-gray-500">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)} of {filteredListings.length}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs md:text-sm"
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
                  className={`p-1.5 md:p-2 ${viewMode === 'list' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-1.5 md:p-2 ${viewMode === 'map' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Map className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="px-2 py-4 md:px-4 md:py-6">
        <div className="max-w-screen-xl mx-auto">
          {filteredListings.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-gray-500 text-base md:text-lg mb-4">No items found</p>
              <p className="text-gray-400 text-sm md:text-base">Try adjusting your filters or search terms</p>
            </div>
          ) : viewMode === 'map' ? (
            <div className="h-[400px] md:h-[600px] w-full rounded-lg overflow-hidden border border-gray-200">
              <MapView
                listings={filteredListings.map((listing) => ({
                  ...listing,
                  distance: 0, // Distance calculation to be implemented later
                }))}
                userLocation={userLocation}
                onFavoriteToggle={toggleFavorite}
                favorites={favorites}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {paginatedListings.map((listing) => {
                  return (
                    <ListingCard
                      key={listing.id}
                      id={listing.id}
                      title={listing.title}
                      images={listing.images}
                      price={listing.price_per_day}
                      period="day"
                      category={listing.category}
                      city={listing.city}
                      state={listing.state}
                      delivery_available={listing.delivery_available}
                      pickup_available={listing.pickup_available}
                      rating={listing.rating || 0}
                      reviewCount={listing.review_count || 0}
                      distance={0} // Distance is not available in the current fetch, so set to 0
                      owner={{
                        name: listing.profiles?.full_name || 'Anonymous',
                        avatar: listing.profiles?.avatar_url || undefined
                      }}
                      isFavorited={favorites.has(listing.id)}
                      onFavoriteToggle={() => toggleFavorite(listing.id)}
                    />
                  );
                })}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center mt-6 md:mt-8 space-x-1 md:space-x-2">
                  {/* Previous button */}
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`px-2 md:px-3 py-2 rounded-lg border text-xs md:text-sm ${
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
                      className={`px-2 md:px-3 py-2 rounded-lg border text-xs md:text-sm min-w-[32px] md:min-w-[40px] ${
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
                    className={`px-2 md:px-3 py-2 rounded-lg border text-xs md:text-sm ${
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
      </div>
    </>
  );
}

export default function BrowsePage() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For authenticated users, show full layout with left sidebar
  if (isAuthenticated) {
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

  // For non-authenticated users, show simple layout without left sidebar
  return (
    <div className="min-h-screen bg-gray-50">
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
    </div>
  );
} 