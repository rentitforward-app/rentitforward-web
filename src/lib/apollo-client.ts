import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { 
  apolloClientConfig,
  FRAGMENTS,
  QUERIES,
  MUTATIONS 
} from '@rentitforward/shared/graphql';

// HTTP Link for GraphQL endpoint
const httpLink = createHttpLink({
  uri: '/api/graphql',
  credentials: 'same-origin', // Include cookies for authentication
});

// Auth link to add authentication headers
const authLink = setContext((_, { headers }) => {
  // Get authentication token from localStorage or cookies if needed
  // For now, we rely on cookies being sent automatically
  return {
    headers: {
      ...headers,
      // Add any additional headers here
    },
  };
});

// Error link for handling GraphQL errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      
      // Handle specific error types
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Redirect to login or show auth modal
        console.warn('User is not authenticated');
      } else if (extensions?.code === 'FORBIDDEN') {
        console.warn('User is not authorized for this action');
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    
    // Handle network errors
    if (networkError.message.includes('Failed to fetch')) {
      console.warn('Network connection lost');
    }
  }
});

// Configure cache with type policies for better normalization
const cache = new InMemoryCache({
  typePolicies: {
    User: {
      fields: {
        listings: {
          merge(existing = { edges: [] }, incoming: any) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
            };
          },
        },
        bookings: {
          merge(existing = { edges: [] }, incoming: any) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
            };
          },
        },
      },
    },
    Listing: {
      fields: {
        reviews: {
          merge(existing = { edges: [] }, incoming: any) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
            };
          },
        },
      },
    },
    Query: {
      fields: {
        listings: {
          keyArgs: ['filter', 'sort'],
          merge(existing = { edges: [] }, incoming: any) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
            };
          },
        },
        bookings: {
          keyArgs: ['filter', 'sort'],
          merge(existing = { edges: [] }, incoming: any) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
            };
          },
        },
      },
    },
  },
});

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  // Enable development tools
  connectToDevTools: process.env.NODE_ENV === 'development',
});

// Export shared GraphQL operations for use in components
export { FRAGMENTS, QUERIES, MUTATIONS };

// Helper function to reset Apollo cache (useful for logout)
export const resetApolloCache = () => {
  return apolloClient.resetStore();
};

// Helper function to refetch all active queries
export const refetchActiveQueries = () => {
  return apolloClient.refetchQueries({
    include: 'active',
  });
}; 