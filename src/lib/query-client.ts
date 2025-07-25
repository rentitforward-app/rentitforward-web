import { QueryClient } from '@tanstack/react-query';

// Query key factories for consistent cache management
export const queryKeys = {
  listings: {
    all: ['listings'] as const,
    list: (filters?: any) => [...queryKeys.listings.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.listings.all, 'detail', id] as const,
    availability: (id: string) => [...queryKeys.listings.all, 'availability', id] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    list: (userId: string) => [...queryKeys.bookings.all, 'list', userId] as const,
    detail: (id: string) => [...queryKeys.bookings.all, 'detail', id] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    byUser: (userId: string) => [...queryKeys.reviews.all, 'byUser', userId] as const,
    byListing: (listingId: string) => [...queryKeys.reviews.all, 'byListing', listingId] as const,
    summary: (userId: string) => [...queryKeys.reviews.all, 'summary', userId] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => [...queryKeys.profile.all, 'detail', userId] as const,
  },
  payments: {
    all: ['payments'] as const,
    stripeAccount: (userId: string) => [...queryKeys.payments.all, 'stripeAccount', userId] as const,
  },
};

// Create the query client with web-optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - consider data fresh for this time
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for this time
      retry: (failureCount, error: any) => {
        // Don't retry on 404s or other client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for server errors or network issues
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
}); 