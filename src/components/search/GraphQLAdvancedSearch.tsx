'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  useAdvancedSearch,
  useSearchSuggestions,
  useSavedSearches,
  useLocationSearch,
  useSmartFilters,
  useSearchHistory,
  usePersonalizedSearch
} from '@/hooks/graphql/useAdvancedSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
// Note: Slider and Switch components not available, using simplified alternatives
import { formatPrice, formatDate } from '../../../../rentitforward-shared/src/utils/formatting';

interface AdvancedSearchProps {
  onResultSelect?: (listing: any) => void;
  showFilters?: boolean;
  compact?: boolean;
}

/**
 * Advanced Search Component with GraphQL
 * Features: Real-time search, faceted filtering, geolocation, personalization
 */
export function GraphQLAdvancedSearch({ 
  onResultSelect, 
  showFilters = true, 
  compact = false 
}: AdvancedSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // GraphQL hooks
  const {
    searchParams,
    updateSearch,
    addFilter,
    removeFilter,
    clearFilters,
    listings,
    facets,
    metadata,
    loading,
    loadMore,
    hasMore,
    totalCount,
    searchTime,
    hasFilters
  } = useAdvancedSearch();

  const { suggestions, popularSearches, recentSearches } = useSearchSuggestions(searchQuery);
  const { savedSearches } = useSavedSearches();
  const { userLocation, requestLocation, searchNearby, locationPermission } = useLocationSearch();
  const { 
    activeFilters, 
    toggleFilter, 
    clearFilter, 
    getFilterCount, 
    getActiveFilterSummary,
    hasActiveFilters 
  } = useSmartFilters(facets);
  const { searchHistory, addToHistory } = useSearchHistory();
  const { getPersonalizedBoosts } = usePersonalizedSearch();

  // Update search when query changes
  useEffect(() => {
    updateSearch({ query: searchQuery });
    if (searchQuery.trim()) {
      addToHistory(searchQuery);
    }
  }, [searchQuery, updateSearch, addToHistory]);

  // Update search when filters change
  useEffect(() => {
    updateSearch({ filters: activeFilters });
  }, [activeFilters, updateSearch]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleLocationSearch = async () => {
    const location = await requestLocation();
    if (location) {
      const nearbyFilter = searchNearby(25); // 25km radius
      updateSearch({ location: nearbyFilter });
    }
  };

  const handleSortChange = (sortField: string, direction: 'ASC' | 'DESC' = 'DESC') => {
    updateSearch({ sort: { field: sortField, direction } });
  };

  if (compact) {
    return <CompactSearchInterface 
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      suggestions={suggestions}
      loading={loading}
      onSuggestionClick={handleSuggestionClick}
    />;
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">🔍 Advanced Search</CardTitle>
              <CardDescription>
                Find exactly what you're looking for with powerful filters and smart suggestions
              </CardDescription>
            </div>
            
            {/* Search Performance Indicator */}
            {metadata && (
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {totalCount.toLocaleString()} results in {searchTime}ms
                </div>
                {metadata.corrected_query && (
                  <div className="text-xs text-blue-600">
                    Showing results for: "{metadata.corrected_query}"
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search for items, categories, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="text-lg py-3 pr-12"
            />
            
            {/* Search Loading Indicator */}
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {/* Location Search Button */}
            <Button
              variant="outline"
              size="sm"
              className="absolute right-14 top-1/2 transform -translate-y-1/2"
              onClick={handleLocationSearch}
              disabled={locationPermission === 'denied'}
            >
              📍
            </Button>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (searchQuery.length > 0 || popularSearches.length > 0) && (
              <SearchSuggestions
                query={searchQuery}
                suggestions={suggestions}
                popularSearches={popularSearches}
                recentSearches={recentSearches}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Sort:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('relevance')}
              >
                Relevance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('price', 'ASC')}
              >
                Price: Low to High
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('rating')}
              >
                Rating
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('distance', 'ASC')}
                disabled={!userLocation}
              >
                Distance
              </Button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearFilters();
                  setSelectedFilters({});
                }}
                className="text-red-600"
              >
                Clear All Filters ({getFilterCount()})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="lg:col-span-1">
            <SearchFilters
              facets={facets}
              activeFilters={activeFilters}
              onToggleFilter={toggleFilter}
              onClearFilter={clearFilter}
            />
          </div>
        )}

        {/* Search Results */}
        <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <SearchResults
            listings={listings}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onResultSelect={onResultSelect}
            totalCount={totalCount}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* GraphQL Demo Info */}
      <Card className="bg-cyan-50 border-cyan-200">
        <CardHeader>
          <CardTitle className="text-cyan-800">🔍 Advanced Search Features</CardTitle>
        </CardHeader>
        <CardContent className="text-cyan-700">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Search Intelligence:</h4>
              <ul className="space-y-1 text-sm">
                <li>🎯 <strong>Semantic Search</strong>: Understands intent, not just keywords</li>
                <li>📊 <strong>Faceted Filtering</strong>: Dynamic filters based on results</li>
                <li>🌍 <strong>Geolocation</strong>: Distance-based search and sorting</li>
                <li>💡 <strong>Auto-suggestions</strong>: Smart completions and corrections</li>
                <li>⚡ <strong>Real-time</strong>: Results update as you type</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Performance & UX:</h4>
              <ul className="space-y-1 text-sm">
                <li>🚀 <strong>Sub-100ms Response</strong>: GraphQL query optimization</li>
                <li>📝 <strong>Search History</strong>: Personal and popular searches</li>
                <li>🎨 <strong>Result Highlighting</strong>: Shows matching text</li>
                <li>💾 <strong>Smart Caching</strong>: Instant repeat searches</li>
                <li>📱 <strong>Mobile Optimized</strong>: Touch-friendly interface</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Search Suggestions Component
function SearchSuggestions({
  query,
  suggestions,
  popularSearches,
  recentSearches,
  onSuggestionClick
}: any) {
  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
      {/* Query Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-2">
          <div className="text-xs font-semibold text-gray-500 mb-2">Suggestions</div>
          {suggestions.map((suggestion: any, index: number) => (
            <button
              key={index}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center space-x-2"
              onClick={() => onSuggestionClick(suggestion.text)}
            >
              <span className="text-lg">{suggestion.icon || '🔍'}</span>
              <div>
                <div className="font-medium">{suggestion.text}</div>
                {suggestion.count && (
                  <div className="text-xs text-gray-500">{suggestion.count} results</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="border-t p-2">
          <div className="text-xs font-semibold text-gray-500 mb-2">Recent Searches</div>
          {recentSearches.slice(0, 3).map((search: any, index: number) => (
            <button
              key={index}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center space-x-2"
              onClick={() => onSuggestionClick(search.query)}
            >
              <span className="text-lg">🕒</span>
              <span>{search.query}</span>
            </button>
          ))}
        </div>
      )}

      {/* Popular Searches */}
      {popularSearches.length > 0 && (
        <div className="border-t p-2">
          <div className="text-xs font-semibold text-gray-500 mb-2">Popular Searches</div>
          {popularSearches.slice(0, 3).map((search: any, index: number) => (
            <button
              key={index}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center space-x-2"
              onClick={() => onSuggestionClick(search.query)}
            >
              <span className="text-lg">🔥</span>
              <div>
                <div>{search.query}</div>
                <div className="text-xs text-gray-500">{search.count} searches</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Search Filters Component
function SearchFilters({ facets, activeFilters, onToggleFilter, onClearFilter }: any) {
  if (!facets) return <SearchFiltersSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Filter */}
          {facets.categories && facets.categories.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Category</h4>
              <div className="space-y-2">
                {facets.categories.map((category: any) => (
                  <label key={category.name} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.categories?.includes(category.name) || false}
                      onChange={() => onToggleFilter('categories', category.name)}
                      className="rounded"
                    />
                    <span className="text-sm">{category.name}</span>
                    <Badge variant="outline" className="text-xs">{category.count}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          {facets.price_ranges && (
            <div>
              <h4 className="font-semibold mb-3">Price Range</h4>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Min $"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      onToggleFilter('price_range', { 
                        min: value, 
                        max: activeFilters.price_range?.max || 1000 
                      });
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max $"
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1000;
                      onToggleFilter('price_range', { 
                        min: activeFilters.price_range?.min || 0, 
                        max: value 
                      });
                    }}
                    className="flex-1"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>$0</span>
                  <span>$1000+</span>
                </div>
              </div>
            </div>
          )}

          {/* Location Filter */}
          {facets.locations && facets.locations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Location</h4>
              <div className="space-y-2">
                {facets.locations.slice(0, 5).map((location: any) => (
                  <label key={`${location.city}-${location.state}`} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.locations?.includes(`${location.city}, ${location.state}`) || false}
                      onChange={() => onToggleFilter('locations', `${location.city}, ${location.state}`)}
                      className="rounded"
                    />
                    <span className="text-sm">{location.city}, {location.state}</span>
                    <Badge variant="outline" className="text-xs">{location.count}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Amenities Filter */}
          {facets.amenities && facets.amenities.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Amenities</h4>
              <div className="space-y-2">
                {facets.amenities.slice(0, 8).map((amenity: any) => (
                  <label key={amenity.name} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.amenities?.includes(amenity.name) || false}
                      onChange={() => onToggleFilter('amenities', amenity.name)}
                      className="rounded"
                    />
                    <span className="text-sm">{amenity.name}</span>
                    <Badge variant="outline" className="text-xs">{amenity.count}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Rating Filter */}
          {facets.ratings && facets.ratings.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Minimum Rating</h4>
              <div className="space-y-2">
                {facets.ratings.map((rating: any) => (
                  <label key={rating.rating} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      checked={activeFilters.min_rating === rating.rating}
                      onChange={() => onToggleFilter('min_rating', rating.rating)}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {'⭐'.repeat(rating.rating)} & up
                    </span>
                    <Badge variant="outline" className="text-xs">{rating.count}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Instant Book Filter */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeFilters.instant_book || false}
                onChange={(e) => onToggleFilter('instant_book', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Instant Book Only</span>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Search Results Component
function SearchResults({ 
  listings, 
  loading, 
  hasMore, 
  onLoadMore, 
  onResultSelect, 
  totalCount, 
  searchQuery 
}: any) {
  if (loading && listings.length === 0) {
    return <SearchResultsSkeleton />;
  }

  if (listings.length === 0 && !loading) {
    return <NoResults searchQuery={searchQuery} />;
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {totalCount.toLocaleString()} results
          {searchQuery && ` for "${searchQuery}"`}
        </h3>
      </div>

      {/* Results Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {listings.map((listing: any) => (
          <SearchResultCard
            key={listing.id}
            listing={listing}
            onSelect={onResultSelect}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center pt-8">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
            className="px-8"
          >
            {loading ? 'Loading...' : 'Load More Results'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual Search Result Card
function SearchResultCard({ listing, onSelect }: any) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onSelect?.(listing)}>
      <CardContent className="p-0">
        {/* Image */}
        {listing.images && listing.images[0] && (
          <div className="aspect-video relative overflow-hidden rounded-t-lg">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.instant_book && (
              <Badge className="absolute top-2 left-2 bg-green-600">
                ⚡ Instant Book
              </Badge>
            )}
            {listing.searchScore && listing.searchScore > 0.9 && (
              <Badge className="absolute top-2 right-2 bg-blue-600">
                🎯 Perfect Match
              </Badge>
            )}
          </div>
        )}

        <div className="p-4">
          {/* Title and Rating */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold line-clamp-2 flex-1">{listing.title}</h4>
            {listing.rating && (
              <div className="flex items-center ml-2">
                <span className="text-yellow-500">⭐</span>
                <span className="text-sm ml-1">{listing.rating}</span>
              </div>
            )}
          </div>

          {/* Location and Distance */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <span>📍 {listing.location.city}, {listing.location.state}</span>
            {listing.location.distance_from_user && (
              <span className="ml-2">• {listing.location.distance_from_user.toFixed(1)}km away</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-green-600">
                {formatPrice(listing.price_per_day)}/day
              </span>
              {listing.pricing?.weekly_discount && (
                <span className="text-xs text-green-600 ml-2">
                  {(listing.pricing.weekly_discount * 100).toFixed(0)}% weekly discount
                </span>
              )}
            </div>
            <Badge variant="outline">{listing.category}</Badge>
          </div>

          {/* Owner Info */}
          <div className="flex items-center mt-3 pt-3 border-t">
            {listing.owner.avatar_url && (
              <img
                src={listing.owner.avatar_url}
                alt={listing.owner.full_name}
                className="w-6 h-6 rounded-full mr-2"
              />
            )}
            <span className="text-sm text-gray-600">{listing.owner.full_name}</span>
            {listing.owner.verified && (
              <Badge variant="secondary" className="ml-2 text-xs">✅</Badge>
            )}
          </div>

          {/* Highlights */}
          {listing.highlights && listing.highlights.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Matches: </span>
              {listing.highlights.map((highlight: any, index: number) => (
                <span key={index} className="mr-2">
                  {highlight.field}: "{highlight.fragments.join('...')}"
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact Search Interface for embedded use
function CompactSearchInterface({ 
  searchQuery, 
  setSearchQuery, 
  suggestions, 
  loading, 
  onSuggestionClick 
}: any) {
  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pr-10"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1">
          {suggestions.slice(0, 5).map((suggestion: any, index: number) => (
            <button
              key={index}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
              onClick={() => onSuggestionClick(suggestion.text)}
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// No Results Component
function NoResults({ searchQuery }: { searchQuery: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No results found
        </h3>
        <p className="text-gray-600 mb-6">
          {searchQuery 
            ? `We couldn't find any listings matching "${searchQuery}"`
            : "Try adjusting your search criteria or filters"
          }
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Try:</p>
          <ul className="space-y-1">
            <li>• Using different keywords</li>
            <li>• Removing some filters</li>
            <li>• Checking for typos</li>
            <li>• Searching in a wider area</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeletons
function SearchResultsSkeleton() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <Skeleton className="aspect-video rounded-t-lg" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SearchFiltersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-20" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 