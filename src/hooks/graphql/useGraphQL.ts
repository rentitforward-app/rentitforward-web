import { useQuery, useMutation, gql } from '@apollo/client';
import { QUERIES, MUTATIONS } from '@rentitforward/shared/graphql';
import type { 
  GraphQLUser, 
  GraphQLListing, 
  GraphQLBooking 
} from '@rentitforward/shared/graphql';

// User Hooks
export function useCurrentUser() {
  const { data, loading, error, refetch } = useQuery(gql(QUERIES.GET_ME), {
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  return {
    user: data?.me as GraphQLUser | null,
    loading,
    error,
    refetch,
  };
}

export function useUser(userId: string) {
  const { data, loading, error } = useQuery(gql`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        full_name
        avatar_url
        phone_number
        bio
        created_at
        updated_at
      }
    }
  `, {
    variables: { id: userId },
    skip: !userId,
    errorPolicy: 'all',
  });

  return {
    user: data?.user as GraphQLUser | null,
    loading,
    error,
  };
}

// Listing Hooks
export function useListing(listingId: string) {
  const { data, loading, error, refetch } = useQuery(gql(QUERIES.GET_LISTING), {
    variables: { id: listingId },
    skip: !listingId,
    errorPolicy: 'all',
  });

  return {
    listing: data?.listing as GraphQLListing | null,
    loading,
    error,
    refetch,
  };
}

export function useListings() {
  const { data, loading, error, fetchMore } = useQuery(gql(QUERIES.GET_LISTINGS), {
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  const loadMore = () => {
    if (data?.listings?.pageInfo?.hasNextPage) {
      return fetchMore({
        variables: {
          after: data.listings.pageInfo.endCursor,
        },
      });
    }
  };

  return {
    listings: data?.listings?.edges?.map((edge: any) => edge.node) || [],
    connection: data?.listings,
    loading,
    error,
    loadMore,
    hasMore: data?.listings?.pageInfo?.hasNextPage || false,
  };
}

// Booking Hooks
export function useUserBookings() {
  const { data, loading, error, refetch } = useQuery(gql(QUERIES.GET_BOOKINGS), {
    errorPolicy: 'all',
  });

  return {
    bookings: data?.bookings?.edges?.map((edge: any) => edge.node) || [],
    connection: data?.bookings,
    loading,
    error,
    refetch,
  };
}

// Basic mutation hooks
export function useCreateListing() {
  const [createListing, { data, loading, error }] = useMutation(gql`
    mutation CreateListing($input: CreateListingInput!) {
      createListing(input: $input) {
        success
        message
        listing {
          id
          title
          description
          price_per_day
          owner_id
          created_at
        }
      }
    }
  `, {
    refetchQueries: ['GetListings'],
    awaitRefetchQueries: true,
  });

  const mutate = async (input: any) => {
    try {
      const result = await createListing({
        variables: { input },
      });
      return result.data?.createListing;
    } catch (err) {
      throw err;
    }
  };

  return {
    createListing: mutate,
    data: data?.createListing,
    loading,
    error,
  };
}

export function useSendMessage() {
  const [sendMessage, { data, loading, error }] = useMutation(gql`
    mutation SendMessage($input: SendMessageInput!) {
      sendMessage(input: $input) {
        success
        message
        sentMessage {
          id
          content
          sender_id
          conversation_id
          created_at
        }
      }
    }
  `);

  const mutate = async (input: any) => {
    try {
      const result = await sendMessage({
        variables: { input },
      });
      return result.data?.sendMessage;
    } catch (err) {
      throw err;
    }
  };

  return {
    sendMessage: mutate,
    data: data?.sendMessage,
    loading,
    error,
  };
} 