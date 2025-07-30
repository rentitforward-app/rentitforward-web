import { PubSub } from 'graphql-subscriptions';

// Create a PubSub instance for handling real-time subscriptions
export const pubsub = new PubSub();

// Subscription event types
export const SUBSCRIPTION_EVENTS = {
  MESSAGE_ADDED: 'MESSAGE_ADDED',
  NOTIFICATION_ADDED: 'NOTIFICATION_ADDED',
  BOOKING_STATUS_CHANGED: 'BOOKING_STATUS_CHANGED',
  LISTING_UPDATED: 'LISTING_UPDATED',
} as const;

// Helper functions for publishing events
export const publishMessageAdded = (conversationId: string, message: any) => {
  return pubsub.publish(SUBSCRIPTION_EVENTS.MESSAGE_ADDED, {
    messageAdded: message,
    conversationId,
  });
};

export const publishNotificationAdded = (userId: string, notification: any) => {
  return pubsub.publish(SUBSCRIPTION_EVENTS.NOTIFICATION_ADDED, {
    notificationAdded: notification,
    userId,
  });
};

export const publishBookingStatusChanged = (bookingId: string, booking: any) => {
  return pubsub.publish(SUBSCRIPTION_EVENTS.BOOKING_STATUS_CHANGED, {
    bookingStatusChanged: booking,
    bookingId,
  });
};

export const publishListingUpdated = (listingId: string, listing: any) => {
  return pubsub.publish(SUBSCRIPTION_EVENTS.LISTING_UPDATED, {
    listingUpdated: listing,
    listingId,
  });
}; 