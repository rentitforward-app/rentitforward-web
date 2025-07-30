import { useQuery, useMutation, gql } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Booking management queries
const GET_BOOKING = gql`
  query GetBooking($bookingId: ID!) {
    booking(id: $bookingId) {
      id
      start_date
      end_date
      status
      total_amount
      platform_fee
      security_deposit
      special_requests
      created_at
      updated_at
      
      # Listing details
      listing {
        id
        title
        description
        price_per_day
        category
        images
        location {
          address
          city
          state
        }
        
        # Owner information
        owner {
          id
          full_name
          avatar_url
          rating
          verified
        }
      }
      
      # Renter information
      renter {
        id
        full_name
        avatar_url
        verified
        member_since: created_at
      }
      
      # Payment information
      payment_intent_id
      stripe_charge_id
      refund_amount
      
      # Timeline and history
      status_history {
        status
        timestamp
        note
        updated_by {
          id
          full_name
        }
      }
      
      # Reviews (if completed)
      review {
        id
        rating
        comment
        created_at
      }
      
      # Messages related to booking
      messages(first: 10) {
        edges {
          node {
            id
            content
            created_at
            sender {
              id
              full_name
              avatar_url
            }
          }
        }
      }
    }
  }
`;

const GET_USER_BOOKINGS = gql`
  query GetUserBookings($userId: ID, $filter: BookingFilter, $first: Int = 20) {
    bookings(userId: $userId, filter: $filter, first: $first) {
      edges {
        node {
          id
          start_date
          end_date
          status
          total_amount
          created_at
          
          listing {
            id
            title
            images
            price_per_day
            category
            location {
              city
              state
            }
            owner {
              id
              full_name
              avatar_url
            }
          }
          
          renter {
            id
            full_name
            avatar_url
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

const GET_BOOKING_CALENDAR = gql`
  query GetBookingCalendar($listingId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
    listing(id: $listingId) {
      id
      title
      price_per_day
      
      # Unavailable dates
      unavailable_dates(startDate: $startDate, endDate: $endDate)
      
      # Existing bookings in date range
      bookings(filter: { 
        dateRange: { start: $startDate, end: $endDate }
        statuses: [PENDING, CONFIRMED, IN_PROGRESS]
      }) {
        edges {
          node {
            id
            start_date
            end_date
            status
          }
        }
      }
      
      # Pricing rules and discounts
      pricing_rules {
        min_nights
        max_nights
        weekly_discount
        monthly_discount
        peak_season_multiplier
      }
    }
  }
`;

// Booking management mutations
const CREATE_BOOKING = gql`
  mutation CreateBooking($input: CreateBookingInput!) {
    createBooking(input: $input) {
      success
      message
      booking {
        id
        start_date
        end_date
        status
        total_amount
        platform_fee
        payment_intent_id
        
        listing {
          id
          title
          owner {
            id
            full_name
          }
        }
      }
      payment_client_secret
    }
  }
`;

const UPDATE_BOOKING_STATUS = gql`
  mutation UpdateBookingStatus($input: UpdateBookingStatusInput!) {
    updateBookingStatus(input: $input) {
      success
      message
      booking {
        id
        status
        updated_at
        status_history {
          status
          timestamp
          note
          updated_by {
            id
            full_name
          }
        }
      }
    }
  }
`;

const CANCEL_BOOKING = gql`
  mutation CancelBooking($input: CancelBookingInput!) {
    cancelBooking(input: $input) {
      success
      message
      refund_amount
      cancellation_fee
      booking {
        id
        status
        refund_amount
        updated_at
      }
    }
  }
`;

const MODIFY_BOOKING_DATES = gql`
  mutation ModifyBookingDates($input: ModifyBookingDatesInput!) {
    modifyBookingDates(input: $input) {
      success
      message
      price_difference
      booking {
        id
        start_date
        end_date
        total_amount
        status
      }
      requires_payment
      payment_client_secret
    }
  }
`;

const APPROVE_BOOKING = gql`
  mutation ApproveBooking($input: ApproveBookingInput!) {
    approveBooking(input: $input) {
      success
      message
      booking {
        id
        status
        updated_at
        
        # Notify renter
        notification_sent
      }
    }
  }
`;

const REJECT_BOOKING = gql`
  mutation RejectBooking($input: RejectBookingInput!) {
    rejectBooking(input: $input) {
      success
      message
      refund_amount
      booking {
        id
        status
        updated_at
      }
    }
  }
`;

// Hook for getting a specific booking with all details
export function useBooking(bookingId: string) {
  const {
    data,
    loading,
    error,
    refetch
  } = useQuery(GET_BOOKING, {
    variables: { bookingId },
    skip: !bookingId,
    errorPolicy: 'all'
  });

  return {
    booking: data?.booking,
    loading,
    error,
    refetch,
    
    // Computed values
    isOwner: data?.booking?.listing?.owner?.id === data?.booking?.renter?.id,
    canModify: ['pending', 'confirmed'].includes(data?.booking?.status),
    canCancel: ['pending', 'confirmed'].includes(data?.booking?.status),
    hasReview: !!data?.booking?.review,
    messageCount: data?.booking?.messages?.edges?.length || 0,
  };
}

// Hook for getting user's bookings with filtering
export function useUserBookings(userId?: string, filter?: any) {
  const {
    data,
    loading,
    error,
    fetchMore,
    refetch
  } = useQuery(GET_USER_BOOKINGS, {
    variables: { userId, filter, first: 20 },
    errorPolicy: 'all'
  });

  const loadMore = () => {
    if (data?.bookings?.pageInfo?.hasNextPage) {
      fetchMore({
        variables: {
          after: data.bookings.pageInfo.endCursor
        }
      });
    }
  };

  return {
    bookings: data?.bookings?.edges?.map((edge: any) => edge.node) || [],
    loading,
    error,
    refetch,
    loadMore,
    hasMore: data?.bookings?.pageInfo?.hasNextPage || false,
    totalCount: data?.bookings?.totalCount || 0,
  };
}

// Hook for booking calendar and availability
export function useBookingCalendar(listingId: string, startDate: Date, endDate: Date) {
  const {
    data,
    loading,
    error,
    refetch
  } = useQuery(GET_BOOKING_CALENDAR, {
    variables: { 
      listingId, 
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    },
    skip: !listingId || !startDate || !endDate,
    errorPolicy: 'all'
  });

  return {
    listing: data?.listing,
    unavailableDates: data?.listing?.unavailable_dates || [],
    existingBookings: data?.listing?.bookings?.edges?.map((edge: any) => edge.node) || [],
    pricingRules: data?.listing?.pricing_rules,
    loading,
    error,
    refetch,
  };
}

// Hook for creating a new booking
export function useCreateBooking() {
  const [createBooking, { loading }] = useMutation(CREATE_BOOKING);
  const router = useRouter();
  
  const createNewBooking = async (bookingData: any) => {
    try {
      const result = await createBooking({
        variables: {
          input: bookingData
        },
        // Update cache after successful creation
        update: (cache, { data }) => {
          if (data?.createBooking?.success) {
            // Invalidate relevant queries
            cache.evict({ fieldName: 'bookings' });
            cache.gc();
          }
        }
      });

      if (result.data?.createBooking?.success) {
        toast.success('Booking request sent successfully!');
        
        // Redirect to booking confirmation page
        const bookingId = result.data.createBooking.booking.id;
        router.push(`/bookings/${bookingId}`);
        
        return { 
          success: true, 
          booking: result.data.createBooking.booking,
          paymentClientSecret: result.data.createBooking.payment_client_secret
        };
      } else {
        toast.error(result.data?.createBooking?.message || 'Failed to create booking');
        return { success: false, error: result.data?.createBooking?.message };
      }
    } catch (error) {
      toast.error('Failed to create booking');
      return { success: false, error };
    }
  };

  return {
    createNewBooking,
    loading
  };
}

// Hook for updating booking status (owner actions)
export function useUpdateBookingStatus() {
  const [updateStatus, { loading }] = useMutation(UPDATE_BOOKING_STATUS);
  
  const updateBookingStatus = async (bookingId: string, status: string, note?: string) => {
    try {
      const result = await updateStatus({
        variables: {
          input: { booking_id: bookingId, status, note }
        }
      });

      if (result.data?.updateBookingStatus?.success) {
        toast.success(`Booking ${status.toLowerCase()} successfully!`);
        return { success: true, booking: result.data.updateBookingStatus.booking };
      } else {
        toast.error(result.data?.updateBookingStatus?.message || 'Failed to update booking');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to update booking status');
      return { success: false, error };
    }
  };

  return {
    updateBookingStatus,
    loading
  };
}

// Hook for canceling bookings
export function useCancelBooking() {
  const [cancelBooking, { loading }] = useMutation(CANCEL_BOOKING);
  
  const cancelUserBooking = async (bookingId: string, reason: string) => {
    try {
      const result = await cancelBooking({
        variables: {
          input: { booking_id: bookingId, cancellation_reason: reason }
        }
      });

      if (result.data?.cancelBooking?.success) {
        toast.success('Booking canceled successfully');
        
        const refundAmount = result.data.cancelBooking.refund_amount;
        const cancellationFee = result.data.cancelBooking.cancellation_fee;
        
        return { 
          success: true, 
          refundAmount, 
          cancellationFee,
          booking: result.data.cancelBooking.booking 
        };
      } else {
        toast.error(result.data?.cancelBooking?.message || 'Failed to cancel booking');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to cancel booking');
      return { success: false, error };
    }
  };

  return {
    cancelUserBooking,
    loading
  };
}

// Hook for modifying booking dates
export function useModifyBookingDates() {
  const [modifyDates, { loading }] = useMutation(MODIFY_BOOKING_DATES);
  
  const modifyBookingDates = async (
    bookingId: string, 
    newStartDate: Date, 
    newEndDate: Date
  ) => {
    try {
      const result = await modifyDates({
        variables: {
          input: {
            booking_id: bookingId,
            new_start_date: newStartDate.toISOString(),
            new_end_date: newEndDate.toISOString()
          }
        }
      });

      if (result.data?.modifyBookingDates?.success) {
        toast.success('Booking dates updated successfully!');
        
        return { 
          success: true, 
          booking: result.data.modifyBookingDates.booking,
          priceDifference: result.data.modifyBookingDates.price_difference,
          requiresPayment: result.data.modifyBookingDates.requires_payment,
          paymentClientSecret: result.data.modifyBookingDates.payment_client_secret
        };
      } else {
        toast.error(result.data?.modifyBookingDates?.message || 'Failed to modify dates');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to modify booking dates');
      return { success: false, error };
    }
  };

  return {
    modifyBookingDates,
    loading
  };
}

// Hook for owner actions (approve/reject)
export function useOwnerBookingActions() {
  const [approveBooking, { loading: approveLoading }] = useMutation(APPROVE_BOOKING);
  const [rejectBooking, { loading: rejectLoading }] = useMutation(REJECT_BOOKING);
  
  const approveUserBooking = async (bookingId: string, message?: string) => {
    try {
      const result = await approveBooking({
        variables: {
          input: { booking_id: bookingId, approval_message: message }
        }
      });

      if (result.data?.approveBooking?.success) {
        toast.success('Booking approved successfully!');
        return { success: true, booking: result.data.approveBooking.booking };
      } else {
        toast.error(result.data?.approveBooking?.message || 'Failed to approve booking');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to approve booking');
      return { success: false, error };
    }
  };

  const rejectUserBooking = async (bookingId: string, reason: string) => {
    try {
      const result = await rejectBooking({
        variables: {
          input: { booking_id: bookingId, rejection_reason: reason }
        }
      });

      if (result.data?.rejectBooking?.success) {
        toast.success('Booking rejected');
        return { 
          success: true, 
          refundAmount: result.data.rejectBooking.refund_amount,
          booking: result.data.rejectBooking.booking 
        };
      } else {
        toast.error(result.data?.rejectBooking?.message || 'Failed to reject booking');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to reject booking');
      return { success: false, error };
    }
  };

  return {
    approveUserBooking,
    rejectUserBooking,
    loading: approveLoading || rejectLoading
  };
}

// Hook for booking analytics and insights
export function useBookingAnalytics(dateRange?: { start: Date; end: Date }) {
  const GET_BOOKING_ANALYTICS = gql`
    query GetBookingAnalytics($dateRange: DateRangeInput) {
      bookingAnalytics(dateRange: $dateRange) {
        total_bookings
        confirmed_bookings
        canceled_bookings
        pending_bookings
        total_revenue
        average_booking_value
        occupancy_rate
        
        # Trend data
        revenue_by_month {
          month
          revenue
          booking_count
        }
        
        # Popular listings
        top_listings {
          listing {
            id
            title
            images
          }
          booking_count
          revenue
        }
        
        # Customer insights
        repeat_customers
        new_customers
        customer_satisfaction_avg
      }
    }
  `;

  const { data, loading, error } = useQuery(GET_BOOKING_ANALYTICS, {
    variables: { dateRange },
    errorPolicy: 'all'
  });

  return {
    analytics: data?.bookingAnalytics,
    loading,
    error
  };
} 