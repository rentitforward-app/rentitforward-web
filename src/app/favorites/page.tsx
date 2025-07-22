'use client';

import { useState, useEffect } from 'react';
import { Search, Heart, Star, Calendar, Grid, List, X, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import ListingCard from '@/components/ui/ListingCard';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useAuth } from '@/hooks/use-auth';

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
  view_count: number;
  favorite_count: number;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function FavoritesPage() {
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [paginatedListings, setPaginatedListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination constants
  const ITEMS_PER_PAGE = 24;
  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchFavoriteListings();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortListings();
  }, [favoriteListings, searchTerm, sortBy]);

  // Handle pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedListings(filteredListings.slice(startIndex, endIndex));
  }, [filteredListings, currentPage, ITEMS_PER_PAGE]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const fetchFavoriteListings = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Fetch user's favorites with listing details
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          listing_id,
          listings (
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
            view_count,
            favorite_count,
            created_at,
            profiles!listings_owner_id_fkey (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        throw error;
      }

      // Extract listings from the favorites data and filter out inactive ones
      const listings = (data || [])
        .map(fav => fav.listings)
        .filter(listing => listing && listing.is_active)
        .map(listing => ({
          ...listing,
          profiles: Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles
        })) as Listing[];

      setFavoriteListings(listings);
      
      // Set favorites set for heart icon states
      const favoriteIds = new Set((data || []).map(fav => fav.listing_id));
      setFavorites(favoriteIds);

    } catch (error) {
      console.error('Error fetching favorite listings:', error);
      toast.error('Failed to load saved items');
    } finally {
      setIsLoading(false);
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
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);

        if (error) throw error;
        
        // Update local state
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(listingId);
          return newFavorites;
        });

        // Remove from favoriteListings
        setFavoriteListings(prev => prev.filter(listing => listing.id !== listingId));
        
        toast.success('Removed from saved items');
      } else {
        // This shouldn't happen on favorites page, but handle for completeness
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, listing_id: listingId });

        if (error) throw error;
        
        setFavorites(prev => new Set([...prev, listingId]));
        toast.success('Added to saved items');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...favoriteListings];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.category.toLowerCase().includes(searchTerm.toLowerCase())
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
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredListings(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Helper function to generate consistent mock data based on listing ID
  const getMockListingData = (listingId: string) => {
    const hash = listingId.split('-').reduce((acc, part) => {
      return acc + part.charCodeAt(0);
    }, 0);
    
    return {
      rating: Math.max(3.0, Math.min(5.0, 3.0 + (hash % 100) / 50)),
      reviewCount: Math.max(1, (hash % 50) + 1),
      distance: Math.max(0.5, Math.min(25.0, (hash % 250) / 10))
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

  const sortOptions = [
    { value: 'newest', label: 'Recently Saved' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
  ];

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your saved items...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center space-x-3">
            <Heart className="w-6 h-6 text-red-500" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Saved Items</h1>
          </div>
          
          {favoriteListings.length > 0 && (
            <p className="text-sm text-gray-500">
              {favoriteListings.length} saved {favoriteListings.length === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>

        {/* Search and Filters */}
        {favoriteListings.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search saved items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort */}
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

            {/* View Mode */}
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
        )}
      </div>

      {/* Results Section */}
      <div className="px-2 py-4 md:px-4 md:py-6" data-results-section>
        <div className="max-w-screen-xl mx-auto">
          {filteredListings.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              {favoriteListings.length === 0 ? (
                // No saved items at all
                <div>
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">No saved items yet</h2>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Start browsing and save items you're interested in by clicking the heart icon
                  </p>
                  <Link
                    href="/browse"
                    className="inline-flex items-center px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Browse Items
                  </Link>
                </div>
              ) : (
                // No results for search
                <div>
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">No items found</h2>
                  <p className="text-gray-500 mb-4">
                    No saved items match your search for "{searchTerm}"
                  </p>
                  <button
                    onClick={clearSearch}
                    className="text-green-500 hover:text-green-600 font-medium"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)} of {filteredListings.length} saved {filteredListings.length === 1 ? 'item' : 'items'}
                  {searchTerm && ` for "${searchTerm}"`}
                </p>
              </div>

              {/* Listings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
                      city={listing.city}
                      state={listing.state}
                      delivery_available={listing.delivery_available}
                      pickup_available={listing.pickup_available}
                      rating={mockData.rating}
                      reviewCount={mockData.reviewCount}
                      distance={mockData.distance}
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
                <div className="flex items-center justify-center mt-8 space-x-2">
                  {/* Previous button */}
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg border text-sm ${
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
                      className={`px-3 py-2 rounded-lg border text-sm min-w-[40px] ${
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
                    className={`px-3 py-2 rounded-lg border text-sm ${
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
    </AuthenticatedLayout>
  );
} 