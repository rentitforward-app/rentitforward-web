import { GraphQLContext } from '../context';
import { handleSupabaseError, NotFoundError } from '../errors';

export const listingResolvers = {
  Query: {
    listing: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      try {
        // Use DataLoader for efficient listing loading
        const listing = await context.dataloaders.listings.load(id);
        
        if (!listing) {
          throw new NotFoundError('Listing not found');
        }
        
        return listing;
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
    
    listings: async (_: any, args: any, context: GraphQLContext) => {
      try {
        let query = context.supabase
          .from('listings')
          .select('*')
          .eq('is_active', true);
        
        // Remove approval_status filter for now to get any listings
        const { data: listings, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          throw handleSupabaseError(error);
        }
        
        // Always return a valid connection, even if empty
        return {
          edges: (listings || []).map((listing) => ({
            node: listing,
            cursor: Buffer.from(`listing:${listing.id}`).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: listings && listings.length > 0 ? Buffer.from(`listing:${listings[0].id}`).toString('base64') : null,
            endCursor: listings && listings.length > 0 ? Buffer.from(`listing:${listings[listings.length - 1].id}`).toString('base64') : null,
          },
          totalCount: listings?.length || 0,
        };
      } catch (error) {
        console.error('Error in listings query:', error);
        // Return empty connection instead of throwing
        return {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        };
      }
    },
  },
  
  Listing: {
    owner: async (parent: any, _: any, context: GraphQLContext) => {
      try {
        // Use DataLoader for efficient user loading
        const owner = await context.dataloaders.users.load(parent.owner_id);
        
        if (!owner) {
          throw new NotFoundError('Listing owner not found');
        }
        
        return owner;
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },

    // Add reviews field resolver for listing reviews
    reviews: async (parent: any, args: any, context: GraphQLContext) => {
      try {
        // Use DataLoader to efficiently batch load reviews by listing
        const reviews = await context.dataloaders.reviewsByListing.load(parent.id);
        
        return {
          edges: (reviews || []).map((review) => ({
            node: review,
            cursor: Buffer.from(`review:${review.id}`).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: reviews?.length || 0,
        };
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
    
    location: (parent: any) => {
      if (!parent.location) return null;
      
      // Parse PostGIS point format if needed
      if (typeof parent.location === 'string') {
        const match = parent.location.match(/POINT\(([^\s]+)\s+([^\)]+)\)/);
        if (match) {
          return {
            coordinates: [parseFloat(match[1]), parseFloat(match[2])],
            address: parent.address,
            city: parent.city,
            state: parent.state,
            country: parent.country,
            postal_code: parent.postal_code,
          };
        }
      }
      
      return parent.location;
    },
  },
}; 