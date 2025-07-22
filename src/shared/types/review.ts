import { z } from 'zod';

// Review Types
export enum ReviewType {
  RENTER_TO_OWNER = 'renter_to_owner',
  OWNER_TO_RENTER = 'owner_to_renter'
}

export enum ReviewTag {
  // Positive tags
  EXCELLENT_COMMUNICATION = 'excellent_communication',
  CLEAN_ITEM = 'clean_item',
  AS_DESCRIBED = 'as_described',
  EASY_PICKUP = 'easy_pickup',
  FLEXIBLE = 'flexible',
  RESPONSIVE = 'responsive',
  RELIABLE = 'reliable',
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  GREAT_VALUE = 'great_value',
  
  // Neutral/Improvement tags
  LATE_RESPONSE = 'late_response',
  ITEM_CONDITION_OKAY = 'item_condition_okay',
  PICKUP_DELAYED = 'pickup_delayed',
  COMMUNICATION_UNCLEAR = 'communication_unclear',
  
  // Negative tags (rare, for serious issues)
  ITEM_NOT_AS_DESCRIBED = 'item_not_as_described',
  POOR_CONDITION = 'poor_condition',
  DIFFICULT_COMMUNICATION = 'difficult_communication',
  UNRELIABLE = 'unreliable'
}

// Review Schema
export const ReviewSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  type: z.nativeEnum(ReviewType),
  
  // Review Content
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(1000).optional(),
  tags: z.array(z.nativeEnum(ReviewTag)).max(5).default([]),
  
  // Optional detailed ratings
  detailedRatings: z.object({
    communication: z.number().min(1).max(5).optional(),
    reliability: z.number().min(1).max(5).optional(),
    cleanliness: z.number().min(1).max(5).optional(), // For items
    accuracy: z.number().min(1).max(5).optional(), // How accurate the listing was
    experience: z.number().min(1).max(5).optional() // Overall experience
  }).optional(),
  
  // Review Status
  isPublic: z.boolean().default(true),
  isEdited: z.boolean().default(false),
  editedAt: z.string().datetime().optional(),
  
  // Response from reviewee
  response: z.object({
    comment: z.string().max(500),
    createdAt: z.string().datetime()
  }).optional(),
  
  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Create Review Schema
export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid(),
  type: z.nativeEnum(ReviewType),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(1000).optional(),
  tags: z.array(z.nativeEnum(ReviewTag)).max(5).default([]),
  detailedRatings: ReviewSchema.shape.detailedRatings.optional(),
  isPublic: z.boolean().default(true)
});

// Update Review Schema
export const UpdateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(10).max(1000).optional(),
  tags: z.array(z.nativeEnum(ReviewTag)).max(5).optional(),
  detailedRatings: ReviewSchema.shape.detailedRatings.optional(),
  isPublic: z.boolean().optional()
});

// Review Response Schema
export const ReviewResponseSchema = z.object({
  reviewId: z.string().uuid(),
  comment: z.string().max(500)
});

// Review Filter Schema
export const ReviewFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  revieweeId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
  type: z.nativeEnum(ReviewType).optional(),
  minRating: z.number().min(1).max(5).optional(),
  maxRating: z.number().min(1).max(5).optional(),
  hasComment: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  searchText: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'rating_high', 'rating_low']).default('newest'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// Review Statistics Schema
export const ReviewStatsSchema = z.object({
  totalReviews: z.number().min(0),
  averageRating: z.number().min(0).max(5),
  ratingDistribution: z.object({
    1: z.number().min(0),
    2: z.number().min(0),
    3: z.number().min(0),
    4: z.number().min(0),
    5: z.number().min(0)
  }),
  detailedAverages: z.object({
    communication: z.number().min(0).max(5).optional(),
    reliability: z.number().min(0).max(5).optional(),
    cleanliness: z.number().min(0).max(5).optional(),
    accuracy: z.number().min(0).max(5).optional(),
    experience: z.number().min(0).max(5).optional()
  }).optional(),
  mostUsedTags: z.array(z.object({
    tag: z.nativeEnum(ReviewTag),
    count: z.number().min(0)
  })).max(10).default([]),
  reviewsByType: z.object({
    asRenter: z.number().min(0),
    asOwner: z.number().min(0)
  })
});

// Review Notification Schema
export const ReviewNotificationSchema = z.object({
  bookingId: z.string().uuid(),
  notificationType: z.enum(['review_request', 'review_received', 'review_response']),
  recipientId: z.string().uuid(),
  senderId: z.string().uuid(),
  reviewId: z.string().uuid().optional()
});

// Export types
export type Review = z.infer<typeof ReviewSchema>;
export type CreateReview = z.infer<typeof CreateReviewSchema>;
export type UpdateReview = z.infer<typeof UpdateReviewSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type ReviewFilter = z.infer<typeof ReviewFilterSchema>;
export type ReviewStats = z.infer<typeof ReviewStatsSchema>;
export type ReviewNotification = z.infer<typeof ReviewNotificationSchema>;

// Utility types
export type ReviewWithUser = Review & {
  reviewer: {
    id: string;
    name: string;
    avatar?: string;
  };
  reviewee: {
    id: string;
    name: string;
    avatar?: string;
  };
  booking: {
    id: string;
    listingTitle: string;
    startDate: string;
    endDate: string;
  };
};

export type ReviewSummary = {
  id: string;
  rating: number;
  comment?: string;
  tags: ReviewTag[];
  reviewer: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
};

// Helper functions for display
export const getReviewTagLabel = (tag: ReviewTag): string => {
  const labels: Record<ReviewTag, string> = {
    [ReviewTag.EXCELLENT_COMMUNICATION]: 'Excellent Communication',
    [ReviewTag.CLEAN_ITEM]: 'Clean Item',
    [ReviewTag.AS_DESCRIBED]: 'As Described',
    [ReviewTag.EASY_PICKUP]: 'Easy Pickup',
    [ReviewTag.FLEXIBLE]: 'Flexible',
    [ReviewTag.RESPONSIVE]: 'Responsive',
    [ReviewTag.RELIABLE]: 'Reliable',
    [ReviewTag.FRIENDLY]: 'Friendly',
    [ReviewTag.PROFESSIONAL]: 'Professional',
    [ReviewTag.GREAT_VALUE]: 'Great Value',
    [ReviewTag.LATE_RESPONSE]: 'Late Response',
    [ReviewTag.ITEM_CONDITION_OKAY]: 'Item Condition Okay',
    [ReviewTag.PICKUP_DELAYED]: 'Pickup Delayed',
    [ReviewTag.COMMUNICATION_UNCLEAR]: 'Communication Unclear',
    [ReviewTag.ITEM_NOT_AS_DESCRIBED]: 'Not As Described',
    [ReviewTag.POOR_CONDITION]: 'Poor Condition',
    [ReviewTag.DIFFICULT_COMMUNICATION]: 'Difficult Communication',
    [ReviewTag.UNRELIABLE]: 'Unreliable'
  };
  return labels[tag];
};

export const getReviewTagColor = (tag: ReviewTag): 'positive' | 'neutral' | 'negative' => {
  const positiveColors = [
    ReviewTag.EXCELLENT_COMMUNICATION,
    ReviewTag.CLEAN_ITEM,
    ReviewTag.AS_DESCRIBED,
    ReviewTag.EASY_PICKUP,
    ReviewTag.FLEXIBLE,
    ReviewTag.RESPONSIVE,
    ReviewTag.RELIABLE,
    ReviewTag.FRIENDLY,
    ReviewTag.PROFESSIONAL,
    ReviewTag.GREAT_VALUE
  ];
  
  const negativeColors = [
    ReviewTag.ITEM_NOT_AS_DESCRIBED,
    ReviewTag.POOR_CONDITION,
    ReviewTag.DIFFICULT_COMMUNICATION,
    ReviewTag.UNRELIABLE
  ];
  
  if (positiveColors.includes(tag)) return 'positive';
  if (negativeColors.includes(tag)) return 'negative';
  return 'neutral';
}; 