import DataLoader from 'dataloader';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  GraphQLUser, 
  GraphQLListing, 
  GraphQLBooking, 
  GraphQLReview,
  GraphQLMessage,
  GraphQLConversation,
  GraphQLCategory
} from '@rentitforward/shared/graphql';

// User DataLoader
export function createUserLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLUser | null>(async (userIds) => {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (error) {
      throw new Error(`Failed to load users: ${error.message}`);
    }

    // Create a map for O(1) lookup
    const userMap = new Map(users?.map(user => [user.id, user]) || []);
    
    // Return results in the same order as input keys
    return userIds.map(id => userMap.get(id) || null);
  });
}

// Listing DataLoader
export function createListingLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLListing | null>(async (listingIds) => {
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles:owner_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .in('id', listingIds);

    if (error) {
      throw new Error(`Failed to load listings: ${error.message}`);
    }

    const listingMap = new Map(listings?.map(listing => [listing.id, listing]) || []);
    return listingIds.map(id => listingMap.get(id) || null);
  });
}

// Listing by Owner DataLoader (for user.listings field)
export function createListingsByOwnerLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLListing[]>(async (ownerIds) => {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .in('owner_id', ownerIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load listings by owner: ${error.message}`);
    }

    // Group listings by owner_id
    const listingsByOwner = new Map<string, GraphQLListing[]>();
    listings?.forEach(listing => {
      const ownerId = listing.owner_id;
      if (!listingsByOwner.has(ownerId)) {
        listingsByOwner.set(ownerId, []);
      }
      listingsByOwner.get(ownerId)!.push(listing);
    });

    return ownerIds.map(ownerId => listingsByOwner.get(ownerId) || []);
  });
}

// Booking DataLoader
export function createBookingLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLBooking | null>(async (bookingIds) => {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles:renter_id (
          id,
          full_name,
          avatar_url,
          email
        ),
        listings:listing_id (
          id,
          title,
          images,
          price_per_day
        )
      `)
      .in('id', bookingIds);

    if (error) {
      throw new Error(`Failed to load bookings: ${error.message}`);
    }

    const bookingMap = new Map(bookings?.map(booking => [booking.id, booking]) || []);
    return bookingIds.map(id => bookingMap.get(id) || null);
  });
}

// Bookings by User DataLoader
export function createBookingsByUserLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLBooking[]>(async (userIds) => {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        listings:listing_id (
          id,
          title,
          images,
          price_per_day
        )
      `)
      .in('renter_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load bookings by user: ${error.message}`);
    }

    const bookingsByUser = new Map<string, GraphQLBooking[]>();
    bookings?.forEach(booking => {
      const userId = booking.renter_id;
      if (!bookingsByUser.has(userId)) {
        bookingsByUser.set(userId, []);
      }
      bookingsByUser.get(userId)!.push(booking);
    });

    return userIds.map(userId => bookingsByUser.get(userId) || []);
  });
}

// Reviews DataLoader
export function createReviewLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLReview | null>(async (reviewIds) => {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:reviewer_id (
          id,
          full_name,
          avatar_url
        ),
        listings:listing_id (
          id,
          title
        )
      `)
      .in('id', reviewIds);

    if (error) {
      throw new Error(`Failed to load reviews: ${error.message}`);
    }

    const reviewMap = new Map(reviews?.map(review => [review.id, review]) || []);
    return reviewIds.map(id => reviewMap.get(id) || null);
  });
}

// Reviews by Listing DataLoader
export function createReviewsByListingLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLReview[]>(async (listingIds) => {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:reviewer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .in('listing_id', listingIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load reviews by listing: ${error.message}`);
    }

    const reviewsByListing = new Map<string, GraphQLReview[]>();
    reviews?.forEach(review => {
      const listingId = review.listing_id;
      if (!reviewsByListing.has(listingId)) {
        reviewsByListing.set(listingId, []);
      }
      reviewsByListing.get(listingId)!.push(review);
    });

    return listingIds.map(listingId => reviewsByListing.get(listingId) || []);
  });
}

// Conversation DataLoader
export function createConversationLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLConversation | null>(async (conversationIds) => {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant1:participant1_id (
          id,
          full_name,
          avatar_url
        ),
        participant2:participant2_id (
          id,
          full_name,
          avatar_url
        ),
        listings:listing_id (
          id,
          title,
          images
        )
      `)
      .in('id', conversationIds);

    if (error) {
      throw new Error(`Failed to load conversations: ${error.message}`);
    }

    const conversationMap = new Map(conversations?.map(conv => [conv.id, conv]) || []);
    return conversationIds.map(id => conversationMap.get(id) || null);
  });
}

// Messages by Conversation DataLoader
export function createMessagesByConversationLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLMessage[]>(async (conversationIds) => {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load messages by conversation: ${error.message}`);
    }

    const messagesByConversation = new Map<string, GraphQLMessage[]>();
    messages?.forEach(message => {
      const conversationId = message.conversation_id;
      if (!messagesByConversation.has(conversationId)) {
        messagesByConversation.set(conversationId, []);
      }
      messagesByConversation.get(conversationId)!.push(message);
    });

    return conversationIds.map(convId => messagesByConversation.get(convId) || []);
  });
}

// Category DataLoader
export function createCategoryLoader(supabase: SupabaseClient) {
  return new DataLoader<string, GraphQLCategory | null>(async (categoryIds) => {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .in('id', categoryIds);

    if (error) {
      throw new Error(`Failed to load categories: ${error.message}`);
    }

    const categoryMap = new Map(categories?.map(cat => [cat.id, cat]) || []);
    return categoryIds.map(id => categoryMap.get(id) || null);
  });
}

// All DataLoaders interface
export interface DataLoaders {
  users: DataLoader<string, GraphQLUser | null>;
  listings: DataLoader<string, GraphQLListing | null>;
  listingsByOwner: DataLoader<string, GraphQLListing[]>;
  bookings: DataLoader<string, GraphQLBooking | null>;
  bookingsByUser: DataLoader<string, GraphQLBooking[]>;
  reviews: DataLoader<string, GraphQLReview | null>;
  reviewsByListing: DataLoader<string, GraphQLReview[]>;
  conversations: DataLoader<string, GraphQLConversation | null>;
  messagesByConversation: DataLoader<string, GraphQLMessage[]>;
  categories: DataLoader<string, GraphQLCategory | null>;
}

// Create all DataLoaders
export function createDataLoaders(supabase: SupabaseClient): DataLoaders {
  return {
    users: createUserLoader(supabase),
    listings: createListingLoader(supabase),
    listingsByOwner: createListingsByOwnerLoader(supabase),
    bookings: createBookingLoader(supabase),
    bookingsByUser: createBookingsByUserLoader(supabase),
    reviews: createReviewLoader(supabase),
    reviewsByListing: createReviewsByListingLoader(supabase),
    conversations: createConversationLoader(supabase),
    messagesByConversation: createMessagesByConversationLoader(supabase),
    categories: createCategoryLoader(supabase),
  };
} 