import { z } from 'zod';

// Booking Types
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded'
}

export enum BookingCancellationReason {
  USER_REQUESTED = 'user_requested',
  OWNER_CANCELLED = 'owner_cancelled',
  ITEM_UNAVAILABLE = 'item_unavailable',
  PAYMENT_FAILED = 'payment_failed',
  POLICY_VIOLATION = 'policy_violation',
  DAMAGE_REPORTED = 'damage_reported',
  OTHER = 'other'
}

export enum DeliveryMethod {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  MEETUP = 'meetup'
}

// Booking Schema
export const BookingSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  ownerId: z.string().uuid(),
  renterId: z.string().uuid(),
  status: z.nativeEnum(BookingStatus).default(BookingStatus.PENDING),
  
  // Dates and Duration
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  durationDays: z.number().min(1),
  
  // Pricing Breakdown
  pricing: z.object({
    basePrice: z.number().min(0),
    totalDays: z.number().min(1),
    subtotal: z.number().min(0),
    weeklyDiscount: z.number().min(0).optional(),
    monthlyDiscount: z.number().min(0).optional(),
    cleaningFee: z.number().min(0).optional(),
    deliveryFee: z.number().min(0).optional(),
    serviceFee: z.number().min(0),
    securityDeposit: z.number().min(0).optional(),
    tax: z.number().min(0),
    total: z.number().min(0),
    currency: z.string().default('AUD')
  }),
  
  // Delivery Information
  delivery: z.object({
    method: z.nativeEnum(DeliveryMethod),
    pickupAddress: z.string().optional(),
    deliveryAddress: z.string().optional(),
    meetupLocation: z.string().optional(),
    pickupTime: z.string().datetime().optional(),
    deliveryTime: z.string().datetime().optional(),
    returnTime: z.string().datetime().optional(),
    notes: z.string().optional()
  }),
  
  // Special Requirements
  specialRequests: z.string().optional(),
  renterNotes: z.string().optional(),
  ownerNotes: z.string().optional(),
  
  // Status Tracking
  confirmedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  cancellationReason: z.nativeEnum(BookingCancellationReason).optional(),
  cancellationNote: z.string().optional(),
  
  // Communication
  lastMessageAt: z.string().datetime().optional(),
  unreadMessagesCount: z.number().min(0).default(0),
  
  // Reviews
  renterReviewId: z.string().uuid().optional(),
  ownerReviewId: z.string().uuid().optional(),
  
  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Create Booking Schema
export const CreateBookingSchema = z.object({
  listingId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  delivery: BookingSchema.shape.delivery,
  specialRequests: z.string().optional(),
  renterNotes: z.string().optional()
});

// Update Booking Schema
export const UpdateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  delivery: BookingSchema.shape.delivery.partial().optional(),
  specialRequests: z.string().optional(),
  renterNotes: z.string().optional(),
  ownerNotes: z.string().optional(),
  cancellationReason: z.nativeEnum(BookingCancellationReason).optional(),
  cancellationNote: z.string().optional()
});

// Booking Filter Schema
export const BookingFilterSchema = z.object({
  status: z.array(z.nativeEnum(BookingStatus)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ownerId: z.string().uuid().optional(),
  renterId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
  sortBy: z.enum(['newest', 'oldest', 'start_date', 'end_date', 'total']).default('newest'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// Export types
export type Booking = z.infer<typeof BookingSchema>;
export type CreateBooking = z.infer<typeof CreateBookingSchema>;
export type UpdateBooking = z.infer<typeof UpdateBookingSchema>;
export type BookingFilter = z.infer<typeof BookingFilterSchema>;
export type BookingPricing = Booking['pricing'];
export type BookingDelivery = Booking['delivery']; 