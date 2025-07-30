import { GraphQLContext, requireAuth } from '../context';
import { handleSupabaseError } from '../errors';
import { pubsub, SUBSCRIPTION_EVENTS, publishNotificationAdded } from '../subscriptions';
import { withFilter } from 'graphql-subscriptions';

export const notificationResolvers = {
  Query: {
    notifications: async (_: any, args: any, context: GraphQLContext) => {
      const user = requireAuth(context);
      
      try {
        const { data: notifications, error } = await context.supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(args.first || 20);

        if (error) {
          throw handleSupabaseError(error);
        }

        return {
          edges: (notifications || []).map((notification) => ({
            node: notification,
            cursor: Buffer.from(`notification:${notification.id}`).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: notifications?.length || 0,
        };
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
  },
  
  Notification: {
    // Add any field resolvers if needed
  },
  
  Mutation: {
    markNotificationAsRead: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);
      
      try {
        const { data: notification, error } = await context.supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          throw handleSupabaseError(error);
        }

        return {
          success: true,
          message: 'Notification marked as read',
          notification,
        };
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
  },
  
  Subscription: {
    notificationAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.NOTIFICATION_ADDED]),
        (payload, variables, context) => {
          // Only send notifications to the intended user
          return payload.userId === context.user?.id;
        }
      ),
    },
  },
}; 