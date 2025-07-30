import { userResolvers } from './user';
import { listingResolvers } from './listing';
import { bookingResolvers } from './booking';
import { reviewResolvers } from './review';
import { messageResolvers } from './message';
import { categoryResolvers } from './category';
import { notificationResolvers } from './notification';
import { searchResolvers } from './search';
import { dashboardResolvers } from './dashboard';
import { mutationResolvers } from './mutations';

// Combine all resolvers
export const resolvers = {
  Query: {
    // User queries
    ...userResolvers.Query,
    
    // Listing queries
    ...listingResolvers.Query,
    
    // Booking queries
    ...bookingResolvers.Query,
    
    // Review queries
    ...reviewResolvers.Query,
    
    // Message queries
    ...messageResolvers.Query,
    
    // Category queries
    ...categoryResolvers.Query,
    
    // Notification queries
    ...notificationResolvers.Query,
    
    // Search queries
    ...searchResolvers.Query,
    
    // Dashboard queries
    ...dashboardResolvers.Query,
  },
  
  Mutation: {
    ...mutationResolvers,
  },
  
  Subscription: {
    // Message subscriptions
    ...messageResolvers.Subscription,
    
    // Booking subscriptions
    ...bookingResolvers.Subscription,
    
    // Notification subscriptions
    ...notificationResolvers.Subscription,
  },
  
  // Type resolvers
  User: userResolvers.User,
  Listing: listingResolvers.Listing,
  Booking: bookingResolvers.Booking,
  Review: reviewResolvers.Review,
  Message: messageResolvers.Message,
  Conversation: messageResolvers.Conversation,
  Category: categoryResolvers.Category,
  Notification: notificationResolvers.Notification,
  
  // Scalar resolvers
  DateTime: {
    serialize: (date: Date) => date.toISOString(),
    parseValue: (value: string) => new Date(value),
    parseLiteral: (ast: any) => new Date(ast.value),
  },
  
  JSON: {
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => JSON.parse(ast.value),
  },
}; 