'use client';

import React from 'react';
import { useListings, useCurrentUser, useCreateListing } from '@/hooks/graphql/useGraphQL';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@rentitforward/shared/utils/formatting';

/**
 * Example component demonstrating GraphQL usage for listings
 * This replaces traditional REST API calls with GraphQL queries and mutations
 */
export function GraphQLListingsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { listings, loading: listingsLoading, error, loadMore, hasMore } = useListings();
  const { createListing, loading: creating } = useCreateListing();

  // Handle create listing (example)
  const handleCreateListing = async () => {
    try {
      const result = await createListing({
        title: 'Sample GraphQL Listing',
        description: 'This listing was created using GraphQL mutations',
        price_per_day: 29.99,
        category: 'electronics',
        images: [],
        location: {
          address: '123 Main St',
          city: 'Sample City',
          state: 'CA',
          country: 'US',
          zip_code: '12345',
        },
      });
      
      if (result?.success) {
        console.log('Listing created successfully:', result.listing);
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
    }
  };

  if (userLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* Header with user info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GraphQL Listings</h1>
            <p className="text-muted-foreground">
              {user ? `Welcome back, ${user.full_name}!` : 'Browsing as guest'}
            </p>
          </div>
          
          {user && (
            <Button 
              onClick={handleCreateListing}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Sample Listing'}
            </Button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">
                Error loading listings: {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading state for listings */}
        {listingsLoading && listings.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{listing.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {listing.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Listing images */}
                  {listing.images && listing.images.length > 0 && (
                    <div className="aspect-video bg-muted rounded-md mb-4 flex items-center justify-center">
                      <img 
                        src={listing.images[0]} 
                        alt={listing.title}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(listing.price_per_day)}
                      </span>
                      <span className="text-sm text-muted-foreground">per day</span>
                    </div>
                    
                    {/* Location */}
                    {listing.location && (
                      <p className="text-sm text-muted-foreground">
                        📍 {listing.location.city}, {listing.location.state}
                      </p>
                    )}
                    
                    {/* Owner info (if available through GraphQL relationships) */}
                    {listing.owner && (
                      <div className="flex items-center space-x-2 pt-2 border-t">
                        {listing.owner.avatar_url && (
                          <img 
                            src={listing.owner.avatar_url} 
                            alt={listing.owner.full_name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm text-muted-foreground">
                          by {listing.owner.full_name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={loadMore}
              disabled={listingsLoading}
            >
              {listingsLoading ? 'Loading...' : 'Load More Listings'}
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!listingsLoading && listings.length === 0 && !error && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No Listings Found</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a listing using GraphQL!
              </p>
              {user && (
                <Button onClick={handleCreateListing} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Your First Listing'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* GraphQL Info Panel */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">🚀 GraphQL Features Demo</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">What you're seeing:</h4>
                <ul className="space-y-1 text-sm">
                  <li>✅ Efficient data loading with DataLoader</li>
                  <li>✅ Real-time optimistic updates</li>
                  <li>✅ Automated cache management</li>
                  <li>✅ Error handling and loading states</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">GraphQL Benefits:</h4>
                <ul className="space-y-1 text-sm">
                  <li>🔄 Single request for complex data</li>
                  <li>⚡ No over-fetching or under-fetching</li>
                  <li>🔧 Type-safe with TypeScript</li>
                  <li>📊 Built-in query analytics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 