import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, createContext, useContext } from 'react';

// 🎯 Global GraphQL Enhancement State
interface GraphQLEnhancementContextType {
  isEnabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

const GraphQLEnhancementContext = createContext<GraphQLEnhancementContextType | null>(null);

// Provider component that should wrap the app
export function GraphQLEnhancementProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false); // Start with false for safety
  
  const toggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    console.log(`🚀 GraphQL Enhancement ${newState ? 'ENABLED' : 'DISABLED'}`);
  };
  
  const setEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    console.log(`🚀 GraphQL Enhancement ${enabled ? 'ENABLED' : 'DISABLED'}`);
  };
  
  return (
    <GraphQLEnhancementContext.Provider value={{ isEnabled, toggle, setEnabled }}>
      {children}
    </GraphQLEnhancementContext.Provider>
  );
}

// Hook to use the GraphQL enhancement state
function useGraphQLEnhancementState() {
  const context = useContext(GraphQLEnhancementContext);
  if (!context) {
    // Fallback if provider is not available
    console.warn('GraphQLEnhancementProvider not found, using fallback state');
    return { isEnabled: false, toggle: () => {}, setEnabled: () => {} };
  }
  return context;
}

// GraphQL queries for admin users
const ADMIN_USERS_QUERY = gql`
  query AdminUsers($filter: AdminUserFilter, $sort: AdminSort, $limit: Int) {
    adminUsers(filter: $filter, sort: $sort, limit: $limit) {
      id
      email
      fullName
      role
      verified
      createdAt
      stats {
        listingsCount
        bookingsCount
        totalEarned
        rating
      }
    }
  }
`;

const ADMIN_USERS_STATS_QUERY = gql`
  query AdminUsersStats {
    adminDashboard {
      userStats {
        total
        active
        verified
        new30Days
      }
    }
  }
`;

// GraphQL queries for admin listings
const ADMIN_LISTINGS_QUERY = gql`
  query AdminListings($filter: AdminListingFilter, $sort: AdminSort, $limit: Int) {
    adminListings(filter: $filter, sort: $sort, limit: $limit) {
      id
      title
      description
      category
      pricePerDay
      approvalStatus
      owner {
        id
        fullName
        email
      }
      createdAt
      rejectionReason
    }
  }
`;

const ADMIN_LISTINGS_STATS_QUERY = gql`
  query AdminListingsStats {
    adminDashboard {
      listingStats {
        total
        pending
        approved
        rejected
      }
    }
  }
`;

// GraphQL queries for admin bookings
const ADMIN_BOOKINGS_QUERY = gql`
  query AdminBookings($filter: AdminBookingFilter, $sort: AdminSort, $limit: Int) {
    adminBookings(filter: $filter, sort: $sort, limit: $limit) {
      id
      itemTitle
      renterName
      ownerName
      startDate
      endDate
      totalAmount
      status
      paymentStatus
      createdAt
    }
  }
`;

const ADMIN_BOOKINGS_STATS_QUERY = gql`
  query AdminBookingsStats {
    adminDashboard {
      bookingStats {
        total
        pending
        confirmed
        active
        completed
        cancelled
      }
    }
  }
`;

// Enhanced admin users hook
export function useAdminUsersEnhanced() {
  const { isEnabled: USE_GRAPHQL_ENHANCEMENT } = useGraphQLEnhancementState();
  let apolloClient = null;
  let apolloError = false;
  
  // Safely try to get Apollo Client
  try {
    apolloClient = useApolloClient();
  } catch (error) {
    console.warn('Apollo Client not available, using Supabase only:', error);
    apolloError = true;
  }
  
  const supabase = createClient();
  
  // GraphQL version (optional enhancement) - now reactive to toggle
  const {
    data: graphqlData,
    loading: graphqlLoading,
    error: graphqlError,
    refetch: refetchGraphQL
  } = useQuery({
    queryKey: ['admin-users-graphql', USE_GRAPHQL_ENHANCEMENT],
    queryFn: async () => {
      if (!USE_GRAPHQL_ENHANCEMENT || apolloError || !apolloClient) return null;
      
      console.log('🚀 Loading users via GraphQL...');
      try {
        const result = await apolloClient.query({
          query: ADMIN_USERS_QUERY,
          variables: {
            limit: 50
          }
        });
        console.log('✅ GraphQL users loaded successfully');
        return result.data.adminUsers;
      } catch (error) {
        console.warn('❌ GraphQL admin users query failed, falling back to Supabase:', error);
        return null;
      }
    },
    enabled: USE_GRAPHQL_ENHANCEMENT && !apolloError && !!apolloClient,
  });

  // Supabase version (primary data source)
  const {
    data: supabaseData,
    loading: supabaseLoading,
    error: supabaseError,
    refetch: refetchSupabase
  } = useQuery({
    queryKey: ['admin-users-supabase', USE_GRAPHQL_ENHANCEMENT],
    queryFn: async () => {
      if (USE_GRAPHQL_ENHANCEMENT && graphqlData && !apolloError) {
        console.log('🔄 Skipping Supabase query - using GraphQL data');
        return null; // Skip Supabase if GraphQL is enabled and working
      }
      
      console.log('📊 Loading users via Supabase...');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            phone_number,
            avatar_url,
            role,
            verified,
            identity_verified,
            rating,
            total_reviews,
            created_at,
            updated_at
          `);

        if (error) throw error;

        // Get statistics for each user
        const usersWithStats = await Promise.all(
          data.map(async (user) => {
            const [listingsResponse, renterBookingsResponse, ownerBookingsResponse] = await Promise.all([
              supabase.from('listings').select('id').eq('owner_id', user.id),
              supabase.from('bookings').select('id').eq('renter_id', user.id),
              supabase.from('bookings').select('id').eq('owner_id', user.id),
            ]);

            return {
              ...user,
              listings_count: listingsResponse.data?.length || 0,
              bookings_as_renter_count: renterBookingsResponse.data?.length || 0,
              bookings_as_owner_count: ownerBookingsResponse.data?.length || 0,
              total_earned: 0,
              total_spent: 0,
            };
          })
        );

        console.log('✅ Supabase users loaded successfully');
        return usersWithStats;
      } catch (error) {
        console.error('❌ Error loading users from Supabase:', error);
        throw error;
      }
    },
    enabled: !USE_GRAPHQL_ENHANCEMENT || !graphqlData || apolloError,
  });

  // Determine which data to use
  const finalData = USE_GRAPHQL_ENHANCEMENT && graphqlData && !apolloError ? graphqlData : supabaseData || [];
  const finalLoading = USE_GRAPHQL_ENHANCEMENT && !apolloError ? graphqlLoading : supabaseLoading;
  const finalError = USE_GRAPHQL_ENHANCEMENT && !apolloError ? graphqlError : supabaseError;
  
  // Return enhanced data with GraphQL fallback
  return {
    users: finalData,
    loading: finalLoading,
    error: finalError,
    refetch: USE_GRAPHQL_ENHANCEMENT && !apolloError ? refetchGraphQL : refetchSupabase,
    isUsingGraphQL: USE_GRAPHQL_ENHANCEMENT && !!graphqlData && !apolloError,
    isUsingSupabase: !USE_GRAPHQL_ENHANCEMENT || !graphqlData || apolloError,
    apolloAvailable: !apolloError,
  };
}

// Enhanced admin listings hook
export function useAdminListingsEnhanced() {
  const { isEnabled: USE_GRAPHQL_ENHANCEMENT } = useGraphQLEnhancementState();
  let apolloClient = null;
  let apolloError = false;
  
  try {
    apolloClient = useApolloClient();
  } catch (error) {
    console.warn('Apollo Client not available, using Supabase only:', error);
    apolloError = true;
  }
  
  const supabase = createClient();
  
  // GraphQL version (optional enhancement)
  const {
    data: graphqlData,
    loading: graphqlLoading,
    error: graphqlError
  } = useQuery({
    queryKey: ['admin-listings-graphql'],
    queryFn: async () => {
      if (!USE_GRAPHQL_ENHANCEMENT || apolloError || !apolloClient) return null;
      
      try {
        const result = await apolloClient.query({
          query: ADMIN_LISTINGS_QUERY,
          variables: {
            limit: 50
          }
        });
        return result.data.adminListings;
      } catch (error) {
        console.warn('GraphQL admin listings query failed, falling back to Supabase:', error);
        return null;
      }
    },
    enabled: USE_GRAPHQL_ENHANCEMENT && !apolloError && !!apolloClient,
  });

  // Supabase version (primary data source)
  const {
    data: supabaseData,
    loading: supabaseLoading,
    error: supabaseError,
    refetch: refetchSupabase
  } = useQuery({
    queryKey: ['admin-listings-supabase'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            description,
            category,
            price_per_day,
            images,
            approval_status,
            created_at,
            rejection_reason,
            owner_profile:profiles!owner_id (
              full_name,
              email
            )
          `);

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error loading listings from Supabase:', error);
        throw error;
      }
    },
  });

  return {
    listings: USE_GRAPHQL_ENHANCEMENT && graphqlData && !apolloError ? graphqlData : supabaseData || [],
    loading: USE_GRAPHQL_ENHANCEMENT && !apolloError ? graphqlLoading : supabaseLoading,
    error: USE_GRAPHQL_ENHANCEMENT && !apolloError ? graphqlError : supabaseError,
    refetch: refetchSupabase,
    isUsingGraphQL: USE_GRAPHQL_ENHANCEMENT && !!graphqlData && !apolloError,
    isUsingSupabase: !USE_GRAPHQL_ENHANCEMENT || !graphqlData || apolloError,
    apolloAvailable: !apolloError,
  };
}

// Enhanced admin bookings hook
export function useAdminBookingsEnhanced() {
  const { isEnabled: USE_GRAPHQL_ENHANCEMENT } = useGraphQLEnhancementState();
  let apolloClient = null;
  let apolloError = false;
  
  try {
    apolloClient = useApolloClient();
  } catch (error) {
    console.warn('Apollo Client not available, using Supabase only:', error);
    apolloError = true;
  }
  
  const supabase = createClient();
  
  // GraphQL version (optional enhancement)
  const {
    data: graphqlData,
    loading: graphqlLoading,
    error: graphqlError
  } = useQuery({
    queryKey: ['admin-bookings-graphql'],
    queryFn: async () => {
      if (!USE_GRAPHQL_ENHANCEMENT || apolloError || !apolloClient) return null;
      
      try {
        const result = await apolloClient.query({
          query: ADMIN_BOOKINGS_QUERY,
          variables: {
            limit: 50
          }
        });
        return result.data.adminBookings;
      } catch (error) {
        console.warn('GraphQL admin bookings query failed, falling back to Supabase:', error);
        return null;
      }
    },
    enabled: USE_GRAPHQL_ENHANCEMENT && !apolloError && !!apolloClient,
  });

  // Supabase version (primary data source)
  const {
    data: supabaseData,
    loading: supabaseLoading,
    error: supabaseError,
    refetch: refetchSupabase
  } = useQuery({
    queryKey: ['admin-bookings-supabase'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            payment_status,
            created_at,
            start_date,
            end_date,
            total_amount,
            listings!inner (
              title
            ),
            renter_profile:profiles!renter_id (
              full_name
            ),
            owner_profile:profiles!owner_id (
              full_name
            )
          `);

        if (error) throw error;

        // Transform data to match expected interface
        const transformedData = data.map(booking => ({
          id: booking.id,
          item_title: booking.listings?.title || 'Unknown Item',
          renter_name: booking.renter_profile?.full_name || 'Unknown Renter',
          owner_name: booking.owner_profile?.full_name || 'Unknown Owner',
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount,
          status: booking.status,
          payment_status: booking.payment_status,
          created_at: booking.created_at,
        }));

        return transformedData;
      } catch (error) {
        console.error('Error loading bookings from Supabase:', error);
        throw error;
      }
    },
  });

  return {
    bookings: USE_GRAPHQL_ENHANCEMENT && graphqlData && !apolloError ? graphqlData : supabaseData || [],
    loading: USE_GRAPHQL_ENHANCEMENT && !apolloError ? graphqlLoading : supabaseLoading,
    error: USE_GRAPHQL_ENHANCEMENT && !apolloError ? graphqlError : supabaseError,
    refetch: refetchSupabase,
    isUsingGraphQL: USE_GRAPHQL_ENHANCEMENT && !!graphqlData && !apolloError,
    isUsingSupabase: !USE_GRAPHQL_ENHANCEMENT || !graphqlData || apolloError,
    apolloAvailable: !apolloError,
  };
}

// Enhanced admin stats hook
export function useAdminStatsEnhanced() {
  const { isEnabled: USE_GRAPHQL_ENHANCEMENT } = useGraphQLEnhancementState();
  let apolloClient = null;
  let apolloError = false;
  
  try {
    apolloClient = useApolloClient();
  } catch (error) {
    apolloError = true;
  }
  
  const supabase = createClient();

  // GraphQL version (optional enhancement)
  const {
    data: graphqlStats,
    loading: graphqlLoading,
  } = useQuery({
    queryKey: ['admin-stats-graphql'],
    queryFn: async () => {
      if (!USE_GRAPHQL_ENHANCEMENT || apolloError || !apolloClient) return null;
      
      try {
        const result = await apolloClient.query({
          query: ADMIN_USERS_STATS_QUERY,
        });
        return result.data.adminDashboard.userStats;
      } catch (error) {
        console.warn('GraphQL admin stats query failed, falling back to Supabase:', error);
        return null;
      }
    },
    enabled: USE_GRAPHQL_ENHANCEMENT && !apolloError && !!apolloClient,
  });

  // Supabase version (primary data source)
  const {
    data: supabaseStats,
    loading: supabaseLoading,
  } = useQuery({
    queryKey: ['admin-stats-supabase'],
    queryFn: async () => {
      try {
        const [usersResponse, verifiedResponse, adminResponse] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('profiles').select('id', { count: 'exact' }).eq('verified', true),
          supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'admin'),
        ]);

        // Calculate new users in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: newUsersCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgo.toISOString());

        return {
          total: usersResponse.count || 0,
          verified: verifiedResponse.count || 0,
          admin: adminResponse.count || 0,
          new30Days: newUsersCount || 0,
        };
      } catch (error) {
        console.error('Error loading admin stats from Supabase:', error);
        return {
          total: 0,
          verified: 0,
          admin: 0,
          new30Days: 0,
        };
      }
    },
  });

  return {
    stats: USE_GRAPHQL_ENHANCEMENT && graphqlStats && !apolloError ? graphqlStats : supabaseStats,
    loading: USE_GRAPHQL_ENHANCEMENT && !apolloError ? graphqlLoading : supabaseLoading,
    isUsingGraphQL: USE_GRAPHQL_ENHANCEMENT && !!graphqlStats && !apolloError,
    isUsingSupabase: !USE_GRAPHQL_ENHANCEMENT || !graphqlStats || apolloError,
    apolloAvailable: !apolloError,
  };
}

// Enhanced admin actions hook
export function useAdminActionsEnhanced() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const banUser = async (userId: string) => {
    try {
      // Primary: Use Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'banned' })
        .eq('id', userId);

      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-users-supabase'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-graphql'] });

      return { success: true };
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-users-supabase'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-graphql'] });

      return { success: true };
    } catch (error) {
      console.error('Error unbanning user:', error);
      throw error;
    }
  };

  const verifyUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verified: true })
        .eq('id', userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-users-supabase'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-graphql'] });

      return { success: true };
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  };

  const approveListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ approval_status: 'approved' })
        .eq('id', listingId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-listings-supabase'] });
      queryClient.invalidateQueries({ queryKey: ['admin-listings-graphql'] });

      return { success: true };
    } catch (error) {
      console.error('Error approving listing:', error);
      throw error;
    }
  };

  const rejectListing = async (listingId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ 
          approval_status: 'rejected',
          rejection_reason: reason 
        })
        .eq('id', listingId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-listings-supabase'] });
      queryClient.invalidateQueries({ queryKey: ['admin-listings-graphql'] });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting listing:', error);
      throw error;
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-bookings-supabase'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings-graphql'] });

      return { success: true };
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  };

  return {
    banUser,
    unbanUser,
    verifyUser,
    approveListing,
    rejectListing,
    updateBookingStatus,
  };
}

// Hook to toggle GraphQL enhancement
export function useGraphQLEnhancementToggle() {
  return useGraphQLEnhancementState();
} 