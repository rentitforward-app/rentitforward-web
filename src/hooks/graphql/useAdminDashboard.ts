import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';

// Admin dashboard analytics query
const GET_ADMIN_DASHBOARD = gql`
  query GetAdminDashboard($timeframe: String = "7d") {
    adminDashboard(timeframe: $timeframe) {
      # User Statistics
      userStats {
        total_users
        new_users_this_week
        new_users_last_week
        verified_users
        active_users_30d
        user_growth_rate
        
        # User breakdown
        users_by_status {
          status
          count
        }
        
        # Registration trend
        registration_trend {
          date
          count
        }
      }
      
      # Listing Statistics
      listingStats {
        total_listings
        pending_approval
        approved_listings
        rejected_listings
        active_listings
        featured_listings
        
        # Listing breakdown by category
        listings_by_category {
          category
          count
          approval_rate
        }
        
        # Listing performance
        top_performing_listings {
          listing {
            id
            title
            images
            owner {
              id
              full_name
            }
          }
          booking_count
          revenue
          rating
        }
      }
      
      # Booking Statistics
      bookingStats {
        total_bookings
        pending_bookings
        confirmed_bookings
        completed_bookings
        canceled_bookings
        
        # Booking trends
        booking_trend {
          date
          count
          revenue
        }
        
        # Booking analytics
        average_booking_value
        total_booking_revenue
        booking_conversion_rate
        repeat_booking_rate
      }
      
      # Payment & Revenue
      revenueStats {
        total_revenue
        platform_fees_collected
        successful_payments
        failed_payments
        pending_payouts
        
        # Revenue breakdown
        revenue_by_category {
          category
          revenue
          percentage
        }
        
        # Monthly revenue trend
        monthly_revenue {
          month
          revenue
          growth_rate
        }
      }
      
      # Platform Health
      platformHealth {
        uptime_percentage
        avg_response_time
        error_rate
        active_sessions
        
        # System alerts
        critical_alerts {
          id
          type
          message
          created_at
          status
        }
        
        # Performance metrics
        performance_metrics {
          database_queries_per_second
          cache_hit_rate
          memory_usage
          cpu_usage
        }
      }
      
      # Content Moderation
      moderationQueue {
        pending_listings {
          listing {
            id
            title
            description
            images
            category
            price_per_day
            created_at
            owner {
              id
              full_name
              email
              avatar_url
              verified
            }
          }
          flags {
            type
            reason
            reporter {
              id
              full_name
            }
            created_at
          }
        }
        
        reported_users {
          user {
            id
            full_name
            email
            avatar_url
            created_at
          }
          reports {
            type
            reason
            reporter {
              id
              full_name
            }
            created_at
          }
          severity
        }
        
        pending_reviews {
          review {
            id
            rating
            comment
            created_at
            listing {
              id
              title
            }
            reviewer {
              id
              full_name
            }
          }
          flags {
            reason
            reporter {
              id
              full_name
            }
          }
        }
      }
      
      # Recent Activity Feed
      recentActivity {
        activity_type
        entity_id
        entity_type
        description
        created_at
        user {
          id
          full_name
          avatar_url
        }
        metadata
      }
    }
  }
`;

// Admin users management query
const GET_ADMIN_USERS = gql`
  query GetAdminUsers(
    $filter: AdminUserFilter
    $sort: AdminSort
    $first: Int = 20
    $after: String
  ) {
    adminUsers(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        node {
          id
          full_name
          email
          avatar_url
          created_at
          verified
          last_active
          is_admin
          is_banned
          
          # Account stats
          listings_count
          bookings_count
          reviews_count
          total_earned
          total_spent
          
          # Trust & safety
          verification_status
          trust_score
          reports_against_count
          
          # Activity summary
          recent_activity {
            type
            timestamp
            details
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

// Admin listings management query
const GET_ADMIN_LISTINGS = gql`
  query GetAdminListings(
    $filter: AdminListingFilter
    $sort: AdminSort
    $first: Int = 20
    $after: String
  ) {
    adminListings(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          category
          price_per_day
          images
          approval_status
          rejection_reason
          is_active
          featured
          created_at
          updated_at
          
          # Owner information
          owner {
            id
            full_name
            email
            avatar_url
            verified
            trust_score
          }
          
          # Performance metrics
          views_count
          favorites_count
          bookings_count
          average_rating
          revenue_generated
          
          # Flags and reports
          flags {
            type
            reason
            reporter {
              id
              full_name
            }
            created_at
            status
          }
          
          # Location data
          location {
            city
            state
            country
            coordinates {
              lat
              lng
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      
      # Aggregated stats for filters
      aggregations {
        by_status {
          status
          count
        }
        by_category {
          category
          count
        }
      }
    }
  }
`;

// Admin mutations
const APPROVE_LISTING = gql`
  mutation ApproveListing($listingId: ID!, $note: String) {
    approveListing(listingId: $listingId, note: $note) {
      success
      message
      listing {
        id
        approval_status
        updated_at
      }
    }
  }
`;

const REJECT_LISTING = gql`
  mutation RejectListing($listingId: ID!, $reason: String!) {
    rejectListing(listingId: $listingId, reason: $reason) {
      success
      message
      listing {
        id
        approval_status
        rejection_reason
        updated_at
      }
    }
  }
`;

const BAN_USER = gql`
  mutation BanUser($userId: ID!, $reason: String!, $duration: String) {
    banUser(userId: $userId, reason: $reason, duration: $duration) {
      success
      message
      user {
        id
        is_banned
        ban_reason
        ban_expires_at
      }
    }
  }
`;

const FEATURE_LISTING = gql`
  mutation FeatureListing($listingId: ID!, $featured: Boolean!) {
    featureListing(listingId: $listingId, featured: $featured) {
      success
      message
      listing {
        id
        featured
        updated_at
      }
    }
  }
`;

// Real-time admin subscriptions
const ADMIN_NOTIFICATION_ADDED = gql`
  subscription AdminNotificationAdded {
    adminNotificationAdded {
      id
      type
      title
      message
      priority
      created_at
      data
      
      # Related entities
      user {
        id
        full_name
        avatar_url
      }
      
      listing {
        id
        title
        images
      }
      
      booking {
        id
        start_date
        end_date
      }
    }
  }
`;

const ADMIN_ACTIVITY_FEED = gql`
  subscription AdminActivityFeed {
    adminActivityAdded {
      activity_type
      entity_id
      entity_type
      description
      created_at
      user {
        id
        full_name
        avatar_url
      }
      metadata
    }
  }
`;

// Hook for admin dashboard overview
export function useAdminDashboard(timeframe = '7d') {
  const {
    data,
    loading,
    error,
    refetch
  } = useQuery(GET_ADMIN_DASHBOARD, {
    variables: { timeframe },
    errorPolicy: 'all',
    pollInterval: 60000, // Refresh every minute
  });

  // Real-time admin notifications
  const { data: newNotification } = useSubscription(ADMIN_NOTIFICATION_ADDED);
  const { data: newActivity } = useSubscription(ADMIN_ACTIVITY_FEED);

  // Show toast for high-priority admin notifications
  useEffect(() => {
    if (newNotification?.adminNotificationAdded) {
      const notification = newNotification.adminNotificationAdded;
      
      if (notification.priority === 'high' || notification.priority === 'critical') {
        toast.error(notification.title, {
          description: notification.message,
          duration: 8000,
        });
      } else if (notification.priority === 'medium') {
        toast.success(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      }
    }
  }, [newNotification]);

  const dashboard = data?.adminDashboard;

  return {
    dashboard,
    loading,
    error,
    refetch,
    
    // Quick access to key metrics
    userStats: dashboard?.userStats,
    listingStats: dashboard?.listingStats,
    bookingStats: dashboard?.bookingStats,
    revenueStats: dashboard?.revenueStats,
    platformHealth: dashboard?.platformHealth,
    moderationQueue: dashboard?.moderationQueue,
    recentActivity: dashboard?.recentActivity,
    
    // Real-time updates
    newNotification: newNotification?.adminNotificationAdded,
    newActivity: newActivity?.adminActivityAdded,
    
    // Computed metrics
    totalRevenue: dashboard?.revenueStats?.total_revenue || 0,
    totalUsers: dashboard?.userStats?.total_users || 0,
    pendingApprovals: dashboard?.listingStats?.pending_approval || 0,
    criticalAlerts: dashboard?.platformHealth?.critical_alerts?.length || 0,
  };
}

// Hook for admin user management
export function useAdminUsers(filter?: any, sort?: any) {
  const {
    data,
    loading,
    error,
    fetchMore,
    refetch
  } = useQuery(GET_ADMIN_USERS, {
    variables: { filter, sort, first: 20 },
    errorPolicy: 'all',
  });

  const loadMore = async () => {
    if (data?.adminUsers?.pageInfo?.hasNextPage) {
      await fetchMore({
        variables: {
          after: data.adminUsers.pageInfo.endCursor
        }
      });
    }
  };

  return {
    users: data?.adminUsers?.edges?.map((edge: any) => edge.node) || [],
    loading,
    error,
    refetch,
    loadMore,
    hasMore: data?.adminUsers?.pageInfo?.hasNextPage || false,
    totalCount: data?.adminUsers?.totalCount || 0,
  };
}

// Hook for admin listing management
export function useAdminListings(filter?: any, sort?: any) {
  const {
    data,
    loading,
    error,
    fetchMore,
    refetch
  } = useQuery(GET_ADMIN_LISTINGS, {
    variables: { filter, sort, first: 20 },
    errorPolicy: 'all',
  });

  const loadMore = async () => {
    if (data?.adminListings?.pageInfo?.hasNextPage) {
      await fetchMore({
        variables: {
          after: data.adminListings.pageInfo.endCursor
        }
      });
    }
  };

  return {
    listings: data?.adminListings?.edges?.map((edge: any) => edge.node) || [],
    aggregations: data?.adminListings?.aggregations,
    loading,
    error,
    refetch,
    loadMore,
    hasMore: data?.adminListings?.pageInfo?.hasNextPage || false,
    totalCount: data?.adminListings?.totalCount || 0,
  };
}

// Hook for admin actions
export function useAdminActions() {
  const [approveListing] = useMutation(APPROVE_LISTING);
  const [rejectListing] = useMutation(REJECT_LISTING);
  const [banUser] = useMutation(BAN_USER);
  const [featureListing] = useMutation(FEATURE_LISTING);

  const approveListingAction = async (listingId: string, note?: string) => {
    try {
      const result = await approveListing({
        variables: { listingId, note },
        // Optimistic update
        optimisticResponse: {
          approveListing: {
            success: true,
            message: 'Listing approved',
            listing: {
              id: listingId,
              approval_status: 'approved',
              updated_at: new Date().toISOString(),
            },
          },
        },
      });

      if (result.data?.approveListing?.success) {
        toast.success('Listing approved successfully');
        return { success: true };
      } else {
        toast.error('Failed to approve listing');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to approve listing');
      return { success: false, error };
    }
  };

  const rejectListingAction = async (listingId: string, reason: string) => {
    try {
      const result = await rejectListing({
        variables: { listingId, reason },
        // Optimistic update
        optimisticResponse: {
          rejectListing: {
            success: true,
            message: 'Listing rejected',
            listing: {
              id: listingId,
              approval_status: 'rejected',
              rejection_reason: reason,
              updated_at: new Date().toISOString(),
            },
          },
        },
      });

      if (result.data?.rejectListing?.success) {
        toast.success('Listing rejected');
        return { success: true };
      } else {
        toast.error('Failed to reject listing');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to reject listing');
      return { success: false, error };
    }
  };

  const banUserAction = async (userId: string, reason: string, duration?: string) => {
    try {
      const result = await banUser({
        variables: { userId, reason, duration },
      });

      if (result.data?.banUser?.success) {
        toast.success('User banned successfully');
        return { success: true };
      } else {
        toast.error('Failed to ban user');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to ban user');
      return { success: false, error };
    }
  };

  const featureListingAction = async (listingId: string, featured: boolean) => {
    try {
      const result = await featureListing({
        variables: { listingId, featured },
        // Optimistic update
        optimisticResponse: {
          featureListing: {
            success: true,
            message: featured ? 'Listing featured' : 'Listing unfeatured',
            listing: {
              id: listingId,
              featured,
              updated_at: new Date().toISOString(),
            },
          },
        },
      });

      if (result.data?.featureListing?.success) {
        toast.success(featured ? 'Listing featured' : 'Listing unfeatured');
        return { success: true };
      } else {
        toast.error('Failed to update listing');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to update listing');
      return { success: false, error };
    }
  };

  return {
    approveListing: approveListingAction,
    rejectListing: rejectListingAction,
    banUser: banUserAction,
    featureListing: featureListingAction,
  };
}

// Hook for admin analytics and insights
export function useAdminAnalytics(timeframe = '30d') {
  const GET_ADMIN_ANALYTICS = gql`
    query GetAdminAnalytics($timeframe: String!) {
      adminAnalytics(timeframe: $timeframe) {
        # Growth metrics
        growth_metrics {
          user_growth_rate
          listing_growth_rate
          booking_growth_rate
          revenue_growth_rate
        }
        
        # Engagement metrics
        engagement_metrics {
          daily_active_users
          monthly_active_users
          session_duration_avg
          pages_per_session
          bounce_rate
        }
        
        # Conversion metrics
        conversion_metrics {
          signup_to_listing_rate
          listing_to_booking_rate
          visitor_to_signup_rate
          booking_completion_rate
        }
        
        # Financial metrics
        financial_metrics {
          total_gmv
          platform_revenue
          avg_transaction_size
          revenue_per_user
          customer_lifetime_value
        }
        
        # Geographic data
        geographic_data {
          by_country {
            country
            users
            listings
            bookings
            revenue
          }
          by_city {
            city
            users
            listings
            bookings
          }
        }
        
        # Trends over time
        time_series {
          date
          users
          listings
          bookings
          revenue
          active_sessions
        }
      }
    }
  `;

  const { data, loading, error } = useQuery(GET_ADMIN_ANALYTICS, {
    variables: { timeframe },
    errorPolicy: 'all',
  });

  return {
    analytics: data?.adminAnalytics,
    loading,
    error,
    
    // Quick access to key metrics
    growthMetrics: data?.adminAnalytics?.growth_metrics,
    engagementMetrics: data?.adminAnalytics?.engagement_metrics,
    conversionMetrics: data?.adminAnalytics?.conversion_metrics,
    financialMetrics: data?.adminAnalytics?.financial_metrics,
    geographicData: data?.adminAnalytics?.geographic_data,
    timeSeries: data?.adminAnalytics?.time_series,
  };
}

// Hook for real-time admin monitoring
export function useAdminMonitoring() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Real-time subscriptions
  const { data: newNotification } = useSubscription(ADMIN_NOTIFICATION_ADDED);
  const { data: newActivity } = useSubscription(ADMIN_ACTIVITY_FEED);

  // Manage alerts
  useEffect(() => {
    if (newNotification?.adminNotificationAdded) {
      setAlerts(prev => [newNotification.adminNotificationAdded, ...prev.slice(0, 49)]);
    }
  }, [newNotification]);

  // Manage activity feed
  useEffect(() => {
    if (newActivity?.adminActivityAdded) {
      setActivities(prev => [newActivity.adminActivityAdded, ...prev.slice(0, 99)]);
    }
  }, [newActivity]);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return {
    alerts,
    activities,
    dismissAlert,
    clearAllAlerts,
    hasNewAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter(alert => alert.priority === 'critical'),
  };
} 

// Hook for admin booking management
export function useAdminBookings(filter?: any, sort?: any) {
  const {
    data,
    loading,
    error,
    fetchMore,
    refetch
  } = useQuery(GET_ADMIN_BOOKINGS, {
    variables: { filter, sort, first: 20 },
    errorPolicy: 'all',
  });

  const loadMore = async () => {
    if (data?.adminBookings?.pageInfo?.hasNextPage) {
      await fetchMore({
        variables: {
          after: data.adminBookings.pageInfo.endCursor
        }
      });
    }
  };

  return {
    bookings: data?.adminBookings?.edges?.map((edge: any) => edge.node) || [],
    aggregations: data?.adminBookings?.aggregations,
    loading,
    error,
    refetch,
    loadMore,
    hasMore: data?.adminBookings?.pageInfo?.hasNextPage || false,
    totalCount: data?.adminBookings?.totalCount || 0,
  };
}

// Add GraphQL query for admin bookings
const GET_ADMIN_BOOKINGS = gql`
  query GetAdminBookings(
    $filter: AdminBookingFilter
    $sort: AdminSort
    $first: Int = 20
    $after: String
  ) {
    adminBookings(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        node {
          id
          status
          payment_status
          created_at
          start_date
          end_date
          total_amount
          duration_days
          special_requests
          
          # Listing information
          listing {
            id
            title
            images
            category
            price_per_day
            location {
              address
              city
              state
              country
              coordinates {
                lat
                lng
              }
            }
          }
          
          # Participants
          renter {
            id
            full_name
            email
            avatar_url
            phone_number
            verified
          }
          
          owner {
            id
            full_name
            email
            avatar_url
            phone_number
            verified
          }
          
          # Financial breakdown
          pricing {
            base_amount
            platform_fee
            security_deposit
            insurance_fee
            total_amount
          }
          
          # Booking timeline
          timeline {
            type
            description
            timestamp
            user {
              id
              full_name
            }
          }
          
          # Additional metadata
          cancellation_reason
          refund_status
          insurance_claim
          damage_report
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      
      # Aggregated stats for filters
      aggregations {
        by_status {
          status
          count
        }
        by_payment_status {
          status
          count
        }
        revenue_stats {
          total_revenue
          platform_fees
          avg_booking_value
        }
      }
    }
  }
`; 