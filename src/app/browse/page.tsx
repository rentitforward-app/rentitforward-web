'use client';

// Google Maps types declaration
declare global {
  interface Window {
    google: any;
  }
}

import { useState, useEffect, Suspense, useRef } from 'react';
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
  latitude?: number; // Direct latitude from RPC
  longitude?: number; // Direct longitude from RPC
  distance?: number; // Calculated distance from user
  distance_km?: number; // Distance in kilometers
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
  // IMPORTANT: This browse page only displays listings that meet ALL of these criteria:
// 1. approval_status = 'approved' (approved by admin)
// 2. is_available = true (available for rent, not currently rented)
// 3. is_active = true (active listing by owner, not paused)
// 4. location IS NOT NULL (must have valid location data)
// 5. NOT currently being rented (no active bookings covering current date)
  
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Location search functions with debouncing
  const handleLocationSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocationSearchTerm(value);
    
    // Clear existing timeout
    if (typeof window !== 'undefined' && (window as any).locationSearchTimeout) {
      clearTimeout((window as any).locationSearchTimeout);
    }
    
    if (value.length > 2) {
      // Debounce the search to reduce state changes
      if (typeof window !== 'undefined') {
        (window as any).locationSearchTimeout = setTimeout(() => {
          getLocationSuggestions(value);
        }, 300); // 300ms delay
      } else {
        getLocationSuggestions(value);
      }
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setIsSearchingLocation(false);
    }
  };

  const getLocationSuggestions = async (input: string) => {
    // Only set loading if not already loading to reduce state changes
    if (!isSearchingLocation) {
      setIsSearchingLocation(true);
    }
    
    try {
      // Try Google Maps API first
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
            console.log('No Google predictions found, trying Nominatim fallback');
            // Fallback to Nominatim
            getNominatimSuggestions(input);
          }
          setIsSearchingLocation(false);
        });
      } else {
        console.log('Google Maps Places service not available, using Nominatim fallback');
        // Fallback to Nominatim
        getNominatimSuggestions(input);
      }
    } catch (error) {
      console.error('Error loading Google Maps API, using Nominatim fallback:', error);
      // Fallback to Nominatim
      getNominatimSuggestions(input);
    }
  };

  const getNominatimSuggestions = async (input: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&countrycodes=au&limit=5&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const suggestions = data.map((item: any, index: number) => ({
          place_id: `nominatim_${index}`,
          description: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }));
        
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch (error) {
      console.error('Nominatim search failed:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
    setIsSearchingLocation(false);
  };

  const selectLocationSuggestion = async (suggestion: any) => {
    setLocationSearchTerm(suggestion.description);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setIsSearchingLocation(false);
    
    // Maintain focus on input after selection
    setTimeout(() => {
      if (locationInputRef.current) {
        locationInputRef.current.focus();
      }
    }, 100);
    
    try {
      let coordinates = null;
      
      // Check if this is a Nominatim suggestion (has lat/lng directly)
      if (suggestion.place_id?.startsWith('nominatim_') && suggestion.lat && suggestion.lng) {
        coordinates = {
          lat: suggestion.lat,
          lng: suggestion.lng
        };
      } else {
        // Try Google Places for place_id
        coordinates = await getPlaceCoordinates(suggestion.place_id);
      }
      
      if (coordinates) {
        const newLocation = {
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: suggestion.description,
          type: 'manual' as const,
          timestamp: Date.now()
        };
        setAppLocation(newLocation);
        setSortBy('distance'); // Automatically sort by distance when location is selected
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

  // Re-fetch listings when location changes to get fresh distance calculations
  useEffect(() => {
    if (appLocation) {
      console.log('📍 Location changed, re-fetching listings with new center point:', {
        lat: appLocation.lat,
        lng: appLocation.lng,
        address: appLocation.address,
        type: appLocation.type
      });
      setIsLoading(true);
      fetchListings();
    }
  }, [appLocation]);

  // Handle clicking outside dropdowns to close them and cleanup timeouts
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup location search timeout
      if (typeof window !== 'undefined' && (window as any).locationSearchTimeout) {
        clearTimeout((window as any).locationSearchTimeout);
      }
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

  // Maintain focus on location input when suggestions appear
  useEffect(() => {
    // Only restore focus when suggestions first appear and user is typing
    if (showLocationSuggestions && locationSearchTerm && locationInputRef.current) {
      // Check if focus was lost, restore it
      if (document.activeElement !== locationInputRef.current) {
        const timeoutId = setTimeout(() => {
          if (locationInputRef.current && locationSearchTerm) {
            locationInputRef.current.focus();
            // Restore cursor to end of input
            const length = locationSearchTerm.length;
            locationInputRef.current.setSelectionRange(length, length);
          }
        }, 10);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [showLocationSuggestions]);

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
      
      // Always use the distance function to get coordinates and distance calculations
      console.log('🗺️ Using distance-based query with center point:', appLocation);
      
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_listings_sorted_by_distance', {
          center_lat: appLocation?.lat || -33.8688, // Default to Sydney
          center_lng: appLocation?.lng || 151.2093,
          category_filter: null,
          min_price: null,
          max_price: null,
          max_results: 500
        });
      
      data = functionData;
      error = functionError;

                  // If the function fails, fall back to regular query with same filtering
            if (error || !data) {
              console.log('🔄 Function failed, using fallback query with proper filtering...');
              
              // First, get listings that meet basic criteria
              const { data: candidateListings, error: candidateError } = await supabase
                .from('listings')
                .select(`
                  *,
                  profiles!owner_id (
                    full_name,
                    avatar_url
                  )
                `)
                .eq('approval_status', 'approved')  // Only approved listings
                .eq('is_available', true)           // Only available listings
                .eq('is_active', true)              // Only active listings
                .not('location', 'is', null)       // Must have location data
                .order('created_at', { ascending: false })
                .limit(500);

              if (candidateError || !candidateListings) {
                data = [];
                error = candidateError;
              } else {
                // Get all active bookings to filter out rented items
                const { data: activeBookings } = await supabase
                  .from('bookings')
                  .select('listing_id, start_date, end_date')
                  .in('status', ['active', 'confirmed']);

                // Filter out listings that are currently being rented
                const now = new Date();
                const rentedListingIds = new Set(
                  (activeBookings || [])
                    .filter(booking => {
                      const startDate = new Date(booking.start_date);
                      const endDate = new Date(booking.end_date);
                      return now >= startDate && now <= endDate;
                    })
                    .map(booking => booking.listing_id)
                );

                const availableListings = candidateListings.filter(
                  listing => !rentedListingIds.has(listing.id)
                );

                                data = availableListings;
                error = null;
              }
        
        // Transform fallback data to match function result format
        if (data) {
          data = data.map((item: any) => ({
            ...item,
            owner_name: item.profiles?.full_name,
            owner_avatar: item.profiles?.avatar_url,
            distance_km: null // No distance calculation in fallback
          }));
        }
      }
      
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
        
        // Debug: Log distance values for first few listings
        console.log('🔍 Distance values check:', data.slice(0, 3).map((item: any) => ({
          title: item.title,
          distance_km: item.distance_km,
          latitude: item.latitude,
          longitude: item.longitude
        })));
      }
      
      console.log('✅ Raw Supabase response:', { 
        data: data?.length ? `${data.length} items` : 'No data', 
        error: error ? error.message : 'No error',
        sampleData: data?.[0]
      });
      
      // Check if listings have location data
      if (data && data.length > 0) {
        console.log('🗺️ Sample listing location data:', {
          title: data[0].title,
          hasLocation: !!data[0].location,
          locationValue: data[0].location,
          address: data[0].address
        });
      }

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
      
      // Data is already transformed above, just need to handle sorting
      let listingsWithCoordinates = data as Listing[];
      
      // If not using distance sorting, sort by created_at instead
      if (sortBy !== 'distance') {
        listingsWithCoordinates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      
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
        if (appLocation && typeof appLocation === 'object' && 'lat' in appLocation) {
          // Calculate distance for each listing and sort by distance
          console.log(`🎯 Calculating distances from appLocation: lat=${appLocation.lat}, lng=${appLocation.lng}`);
          const listingsWithDistance = filtered.map(listing => {
            if (listing.latitude && listing.longitude) {
              // Simple distance calculation using Haversine formula
              const toRad = (x: number) => x * Math.PI / 180;
              const lat1 = appLocation.lat;
              const lng1 = appLocation.lng;
              const lat2 = listing.latitude;
              const lng2 = listing.longitude;
              const R = 6371; // Earth radius in km
              const dLat = toRad(lat2 - lat1);
              const dLng = toRad(lng2 - lng1);
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              console.log(`📏 Distance to ${listing.title}: ${distance.toFixed(1)} km`);
              return { ...listing, distance_km: distance };
            }
            console.log(`❌ No coordinates for ${listing.title}`);
            return { ...listing, distance_km: undefined }; // No distance for listings without coordinates
          });
          
          filtered = listingsWithDistance.sort((a, b) => {
            // Handle undefined distances - put them at the end
            if (a.distance_km === undefined && b.distance_km === undefined) return 0;
            if (a.distance_km === undefined) return 1;
            if (b.distance_km === undefined) return -1;
            return a.distance_km! - b.distance_km!;
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
      <div className="bg-white border-b border-gray-200 p-4 md:p-6 overflow-visible">
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
        <div className={`transition-all duration-300 ease-in-out ${
          showMobileFilters 
            ? 'max-h-screen opacity-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 overflow-visible' 
            : 'max-h-0 opacity-0 overflow-hidden md:max-h-screen md:opacity-100 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 lg:gap-6 md:overflow-visible'
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
          <div className="relative" ref={locationDropdownRef}>
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
                ref={locationInputRef}
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
              />
              <button
                onClick={() => {
                  setLocationSearchTerm('');
                  setLocationSuggestions([]);
                  setShowLocationSuggestions(false);
                  setIsSearchingLocation(false);
                  // Clear any pending search timeout
                  if (typeof window !== 'undefined' && (window as any).locationSearchTimeout) {
                    clearTimeout((window as any).locationSearchTimeout);
                  }
                  // Maintain focus on input
                  if (locationInputRef.current) {
                    locationInputRef.current.focus();
                  }
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
              <div className="location-dropdown absolute z-[1000] mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                {locationSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.place_id || index}
                    className="location-dropdown-item px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0"
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
              <div className="category-dropdown absolute z-[1000] mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
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
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 relative z-10" data-results-section>
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
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 md:p-2 ${viewMode === 'grid' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 md:p-2 ${viewMode === 'list' ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-3 h-3 md:w-4 md:h-4" />
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
          ) : (
            <>
              {viewMode === 'grid' ? (
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
                        distance={listing.distance_km} // Use calculated distance
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
              ) : (
                <div className="space-y-4">
                  {paginatedListings.map((listing) => {
                    return (
                      <div key={listing.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row gap-4 p-4">
                          {/* Image section */}
                          <div className="w-full sm:w-48 h-48 flex-shrink-0">
                            <Link href={`/listings/${listing.id}`}>
                              <div className="relative w-full h-full rounded-lg overflow-hidden">
                                <Image
                                  src={listing.images[0] || '/images/placeholder-item.jpg'}
                                  alt={listing.title}
                                  fill
                                  className="object-contain bg-gray-50"
                                />
                              </div>
                            </Link>
                          </div>
                          
                          {/* Content section */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <Link href={`/listings/${listing.id}`}>
                                <h3 className="text-lg font-semibold text-gray-900 hover:text-green-600 transition-colors line-clamp-2">
                                  {listing.title}
                                </h3>
                              </Link>
                              <button
                                onClick={() => toggleFavorite(listing.id)}
                                className="flex-shrink-0 ml-2 p-1"
                              >
                                <Heart 
                                  className={`w-5 h-5 ${
                                    favorites.has(listing.id) 
                                      ? 'fill-red-500 text-red-500' 
                                      : 'text-gray-400 hover:text-red-500'
                                  } transition-colors`}
                                />
                              </button>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                              <span className="bg-gray-100 px-2 py-1 rounded">{listing.category}</span>
                              <span className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {listing.city}, {listing.state}
                              </span>
                              {listing.distance_km && (
                                <span>{listing.distance_km.toFixed(1)} km away</span>
                              )}
                              {(listing.rating || 0) > 0 && (
                                <span className="flex items-center">
                                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                                  {listing.rating?.toFixed(1)} ({listing.review_count})
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-2xl font-bold text-gray-900">
                                  ${listing.price_per_day}
                                </span>
                                <span className="text-gray-600 ml-1">/day</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {listing.delivery_available && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Delivery
                                  </span>
                                )}
                                {listing.pickup_available && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Pickup
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
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