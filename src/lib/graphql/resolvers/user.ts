import { GraphQLContext, requireAuth } from '../context';
import { handleSupabaseError, NotFoundError } from '../errors';

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      const user = requireAuth(context);
      
      try {
        // Use DataLoader for efficient user loading
        const profile = await context.dataloaders.users.load(user.id);
        
        if (!profile) {
          throw new NotFoundError('User profile not found');
        }
        
        return profile;
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
    
    user: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      try {
        // Use DataLoader for efficient user loading
        const profile = await context.dataloaders.users.load(id);
        
        if (!profile) {
          throw new NotFoundError('User not found');
        }
        
        return profile;
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
  },
  
  User: {
    // Field resolvers for User type
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
    
    listings: async (parent: any, args: any, context: GraphQLContext) => {
      try {
        // Use DataLoader to efficiently batch load listings by owner
        const listings = await context.dataloaders.listingsByOwner.load(parent.id);
        
        return {
          edges: (listings || []).map((listing, index) => ({
            node: listing,
            cursor: Buffer.from(`listing:${listing.id}`).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: listings?.length || 0,
        };
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },

    // Add bookings field resolver for user bookings
    bookings: async (parent: any, args: any, context: GraphQLContext) => {
      try {
        // Use DataLoader to efficiently batch load bookings by user
        const bookings = await context.dataloaders.bookingsByUser.load(parent.id);
        
        return {
          edges: (bookings || []).map((booking, index) => ({
            node: booking,
            cursor: Buffer.from(`booking:${booking.id}`).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: bookings?.length || 0,
        };
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
  },
}; 