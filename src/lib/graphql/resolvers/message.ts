import { GraphQLContext, requireAuth } from '../context';
import { handleSupabaseError } from '../errors';
import { pubsub, SUBSCRIPTION_EVENTS, publishMessageAdded } from '../subscriptions';
import { withFilter } from 'graphql-subscriptions';

export const messageResolvers = {
  Query: {
    messages: async (_: any, { conversationId }: { conversationId: string }, context: GraphQLContext) => {
      requireAuth(context);
      
      try {
        const messages = await context.dataloaders.messagesByConversation.load(conversationId);
        
        return {
          edges: messages.map((message) => ({
            node: message,
            cursor: Buffer.from(`message:${message.id}`).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: messages.length,
        };
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
  },
  
  Message: {
    sender: async (parent: any, _: any, context: GraphQLContext) => {
      return context.dataloaders.users.load(parent.sender_id);
    },
  },
  
  Conversation: {
    messages: async (parent: any, _: any, context: GraphQLContext) => {
      const messages = await context.dataloaders.messagesByConversation.load(parent.id);
      
      return {
        edges: messages.map((message) => ({
          node: message,
          cursor: Buffer.from(`message:${message.id}`).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: messages.length,
      };
    },
  },
  
  Mutation: {
    sendMessage: async (_: any, { input }: { input: any }, context: GraphQLContext) => {
      const user = requireAuth(context);
      
      try {
        const { data: message, error } = await context.supabase
          .from('messages')
          .insert({
            ...input,
            sender_id: user.id,
          })
          .select(`
            *,
            sender:sender_id (
              id,
              full_name,
              avatar_url
            )
          `)
          .single();

        if (error) {
          throw handleSupabaseError(error);
        }

        // Publish real-time event
        await publishMessageAdded(input.conversation_id, message);

        return {
          success: true,
          message: 'Message sent successfully',
          sentMessage: message,
        };
      } catch (error) {
        throw handleSupabaseError(error);
      }
    },
  },
  
  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.MESSAGE_ADDED]),
        (payload, variables) => {
          return payload.conversationId === variables.conversationId;
        }
      ),
    },
  },
}; 