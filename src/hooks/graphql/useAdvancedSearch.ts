import { useQuery, useLazyQuery, gql } from '@apollo/client';
import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// Advanced search query with comprehensive filtering
const ADVANCED_SEARCH = gql`
  query AdvancedSearch(
    $query: String
    $filters: SearchFilters
    $sort: SearchSort
    $location: LocationFilter
    $first: Int = 20
    $after: String
  ) {
    search(
      query: $query
      filters: $filters
      sort: $sort
      location: $location
      first: $first
      after: $after
    ) {
      # Main results
      listings {
        edges {
          node {
            id
            title
            description
            price_per_day
            category
            images
            rating
            review_count
            available_from
            available_to
            instant_book
            
            # Location data
            location {
              address
              city
              state
              country
              coordinates {
                lat
                lng
              }
              distance_from_user
            }
            
            # Owner information
            owner {
              id
              full_name
              avatar_url
              verified
              response_rate
              response_time
            }
            
            # Availability calendar
            available_dates
            unavailable_dates
            
            # Pricing details
            pricing {
              base_price
              cleaning_fee
              security_deposit
              weekly_discount
              monthly_discount
            }
            
            # Features and amenities
            features
            amenities
            
            # Booking statistics
            booking_stats {
              total_bookings
              recent_bookings
              occupancy_rate
            }
          }
          # Search relevance score
          score
          # Highlighted text matches
          highlights {
            field
            fragments
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
      
      # Search facets for filtering UI
      facets {
        categories {
          name
          count
          selected
        }
        price_ranges {
          min
          max
          count
          selected
        }
        locations {
          city
          state
          count
          selected
        }
        amenities {
          name
          count
          selected
        }
        ratings {
          rating
          count
          selected
        }
        availability {
          period
          count
          selected
        }
      }
      
      # Search suggestions and corrections
      suggestions {
        query
        type
        confidence
      }
      
      # Search metadata
      search_metadata {
        total_results
        search_time_ms
        applied_filters
        corrected_query
        location_detected
      }
    }
  }
`;

// Autocomplete/suggestions query
const SEARCH_SUGGESTIONS = gql`
  query SearchSuggestions($query: String!, $limit: Int = 10) {
    searchSuggestions(query: $query, limit: $limit) {
      suggestions {
        text
        type
        category
        count
        icon
      }
      popular_searches {
        query
        count
      }
      recent_searches {
        query
        timestamp
      }
    }
  }
`;

// Saved searches query
const GET_SAVED_SEARCHES = gql`
  query GetSavedSearches {
    me {
      saved_searches {
        id
        name
        query
        filters
        created_at
        notification_enabled
        result_count
        last_checked
      }
    }
  }
`;

// Search analytics query
const SEARCH_ANALYTICS = gql`
  query SearchAnalytics($timeframe: String = "7d") {
    searchAnalytics(timeframe: $timeframe) {
      popular_queries {
        query
        count
        trend
      }
      popular_filters {
        filter_type
        filter_value
        usage_count
      }
      search_performance {
        avg_search_time
        total_searches
        zero_result_rate
        click_through_rate
      }
      user_behavior {
        avg_filters_used
        most_used_sort
        common_refinements
      }
    }
  }
`;

// Mutations
const SAVE_SEARCH = gql`
  mutation SaveSearch($input: SaveSearchInput!) {
    saveSearch(input: $input) {
      success
      message
      saved_search {
        id
        name
        query
        filters
        notification_enabled
      }
    }
  }
`;

const DELETE_SAVED_SEARCH = gql`
  mutation DeleteSavedSearch($searchId: ID!) {
    deleteSavedSearch(searchId: $searchId) {
      success
      message
    }
  }
`;

// Main advanced search hook
export function useAdvancedSearch() {
  const [searchParams, setSearchParams] = useState({
    query: '',
    filters: {},
    sort: { field: 'relevance', direction: 'DESC' },
    location: null,
  });
  
  const debouncedQuery = useDebounce(searchParams.query, 300);
  
  const [executeSearch, { data, loading, error, fetchMore }] = useLazyQuery(ADVANCED_SEARCH, {
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  // Execute search when parameters change
  useEffect(() => {
    if (debouncedQuery || Object.keys(searchParams.filters).length > 0) {
      executeSearch({
        variables: {
          query: debouncedQuery,
          filters: searchParams.filters,
          sort: searchParams.sort,
          location: searchParams.location,
          first: 20,
        },
      });
    }
  }, [debouncedQuery, searchParams.filters, searchParams.sort, searchParams.location, executeSearch]);

  const loadMore = async () => {
    if (data?.search?.listings?.pageInfo?.hasNextPage) {
      await fetchMore({
        variables: {
          after: data.search.listings.pageInfo.endCursor,
        },
      });
    }
  };

  const updateSearch = (updates: Partial<typeof searchParams>) => {
    setSearchParams(prev => ({ ...prev, ...updates }));
  };

  const clearFilters = () => {
    setSearchParams(prev => ({ ...prev, filters: {} }));
  };

  const addFilter = (filterType: string, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value,
      },
    }));
  };

  const removeFilter = (filterType: string) => {
    setSearchParams(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[filterType];
      return { ...prev, filters: newFilters };
    });
  };

  return {
    // Search state
    searchParams,
    updateSearch,
    addFilter,
    removeFilter,
    clearFilters,
    
    // Results
    listings: data?.search?.listings?.edges?.map((edge: any) => ({
      ...edge.node,
      searchScore: edge.score,
      highlights: edge.highlights,
    })) || [],
    facets: data?.search?.facets,
    suggestions: data?.search?.suggestions,
    metadata: data?.search?.search_metadata,
    
    // Pagination
    loadMore,
    hasMore: data?.search?.listings?.pageInfo?.hasNextPage || false,
    totalCount: data?.search?.listings?.totalCount || 0,
    
    // Loading state
    loading,
    error,
    
    // Computed values
    hasFilters: Object.keys(searchParams.filters).length > 0,
    searchTime: data?.search?.search_metadata?.search_time_ms,
    resultCount: data?.search?.listings?.totalCount || 0,
  };
}

// Hook for search suggestions and autocomplete
export function useSearchSuggestions(query: string) {
  const debouncedQuery = useDebounce(query, 200);
  
  const { data, loading } = useQuery(SEARCH_SUGGESTIONS, {
    variables: { query: debouncedQuery, limit: 10 },
    skip: !debouncedQuery || debouncedQuery.length < 2,
    errorPolicy: 'all',
  });

  return {
    suggestions: data?.searchSuggestions?.suggestions || [],
    popularSearches: data?.searchSuggestions?.popular_searches || [],
    recentSearches: data?.searchSuggestions?.recent_searches || [],
    loading,
  };
}

// Hook for saved searches
export function useSavedSearches() {
  const { data, loading, error, refetch } = useQuery(GET_SAVED_SEARCHES, {
    errorPolicy: 'all',
  });

  return {
    savedSearches: data?.me?.saved_searches || [],
    loading,
    error,
    refetch,
  };
}

// Hook for search analytics (admin/power users)
export function useSearchAnalytics(timeframe = '7d') {
  const { data, loading, error } = useQuery(SEARCH_ANALYTICS, {
    variables: { timeframe },
    errorPolicy: 'all',
  });

  return {
    analytics: data?.searchAnalytics,
    loading,
    error,
    
    // Quick insights
    topQuery: data?.searchAnalytics?.popular_queries?.[0]?.query,
    avgSearchTime: data?.searchAnalytics?.search_performance?.avg_search_time,
    zeroResultRate: data?.searchAnalytics?.search_performance?.zero_result_rate,
  };
}

// Hook for geolocation-based search
export function useLocationSearch() {
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      return false;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setUserLocation(location);
      setLocationPermission('granted');
      return location;
    } catch (error) {
      setLocationPermission('denied');
      return false;
    }
  };

  const searchNearby = (radius = 25) => {
    if (!userLocation) return null;
    
    return {
      center: userLocation,
      radius_km: radius,
    };
  };

  return {
    userLocation,
    locationPermission,
    requestLocation,
    searchNearby,
  };
}

// Hook for smart filtering with facets
export function useSmartFilters(facets: any) {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const toggleFilter = (category: string, value: any) => {
    setActiveFilters(prev => {
      const currentValues = prev[category] || [];
      const isArray = Array.isArray(currentValues);
      
      if (isArray) {
        // Multi-select filter
        const valueExists = currentValues.includes(value);
        const newValues = valueExists
          ? currentValues.filter((v: any) => v !== value)
          : [...currentValues, value];
          
        return {
          ...prev,
          [category]: newValues.length > 0 ? newValues : undefined,
        };
      } else {
        // Single-select filter
        return {
          ...prev,
          [category]: prev[category] === value ? undefined : value,
        };
      }
    });
  };

  const clearFilter = (category: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[category];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
  };

  const getFilterCount = () => {
    return Object.values(activeFilters).filter(Boolean).length;
  };

  const getActiveFilterSummary = () => {
    const summary: string[] = [];
    
    Object.entries(activeFilters).forEach(([category, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          summary.push(`${category}: ${value.join(', ')}`);
        } else {
          summary.push(`${category}: ${value}`);
        }
      }
    });
    
    return summary;
  };

  return {
    activeFilters,
    toggleFilter,
    clearFilter,
    clearAllFilters,
    getFilterCount,
    getActiveFilterSummary,
    hasActiveFilters: getFilterCount() > 0,
  };
}

// Hook for search history and recent searches
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const maxHistorySize = 20;

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('search_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== query);
      const newHistory = [query, ...filtered].slice(0, maxHistorySize);
      
      // Save to localStorage
      localStorage.setItem('search_history', JSON.stringify(newHistory));
      
      return newHistory;
    });
  };

  const removeFromHistory = (query: string) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(item => item !== query);
      localStorage.setItem('search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search_history');
  };

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}

// Hook for search performance optimization
export function useSearchOptimization() {
  const [searchMetrics, setSearchMetrics] = useState({
    totalSearches: 0,
    avgSearchTime: 0,
    cacheHitRate: 0,
  });

  const trackSearch = (searchTime: number, fromCache: boolean) => {
    setSearchMetrics(prev => ({
      totalSearches: prev.totalSearches + 1,
      avgSearchTime: ((prev.avgSearchTime * prev.totalSearches) + searchTime) / (prev.totalSearches + 1),
      cacheHitRate: fromCache 
        ? ((prev.cacheHitRate * prev.totalSearches) + 1) / (prev.totalSearches + 1)
        : (prev.cacheHitRate * prev.totalSearches) / (prev.totalSearches + 1),
    }));
  };

  return {
    searchMetrics,
    trackSearch,
  };
}

// Hook for search result personalization
export function usePersonalizedSearch(userId?: string) {
  const [preferences, setPreferences] = useState({
    preferredCategories: [],
    preferredPriceRange: { min: 0, max: 1000 },
    preferredLocations: [],
    searchBehavior: {
      avgSessionLength: 0,
      commonFilters: [],
      preferredSort: 'relevance',
    },
  });

  // In a real implementation, this would fetch user's search preferences
  // and browsing history to personalize results
  
  const updatePreferences = (newPreferences: Partial<typeof preferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  const getPersonalizedBoosts = () => {
    // Return boost parameters for the search query
    return {
      category_boosts: preferences.preferredCategories.reduce((acc: any, cat: string) => {
        acc[cat] = 1.2; // 20% boost for preferred categories
        return acc;
      }, {}),
      price_range_boost: preferences.preferredPriceRange,
      location_boosts: preferences.preferredLocations.reduce((acc: any, loc: string) => {
        acc[loc] = 1.1; // 10% boost for preferred locations
        return acc;
      }, {}),
    };
  };

  return {
    preferences,
    updatePreferences,
    getPersonalizedBoosts,
  };
} 