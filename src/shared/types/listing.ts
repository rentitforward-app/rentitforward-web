import { z } from 'zod';

// Listing Types
export enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export enum ListingCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export enum ListingCategory {
  TOOLS_DIY_EQUIPMENT = 'tools_diy_equipment',
  CAMERAS_PHOTOGRAPHY_GEAR = 'cameras_photography_gear',
  EVENT_PARTY_EQUIPMENT = 'event_party_equipment',
  CAMPING_OUTDOOR_GEAR = 'camping_outdoor_gear',
  TECH_ELECTRONICS = 'tech_electronics',
  VEHICLES_TRANSPORT = 'vehicles_transport',
  HOME_GARDEN_APPLIANCES = 'home_garden_appliances',
  SPORTS_FITNESS_EQUIPMENT = 'sports_fitness_equipment',
  MUSICAL_INSTRUMENTS_GEAR = 'musical_instruments_gear',
  COSTUMES_PROPS = 'costumes_props',
  MAKER_CRAFT_SUPPLIES = 'maker_craft_supplies'
}

export enum PricingType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  HOURLY = 'hourly'
}

// Listing Image Schema
export const ListingImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  alt: z.string().optional(),
  order: z.number().min(0),
  uploadedAt: z.string().datetime()
});

// Listing Availability Schema
export const AvailabilitySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  unavailableDates: z.array(z.string().datetime()).optional(),
  minimumRentalPeriod: z.number().min(1).default(1), // in days
  maximumRentalPeriod: z.number().min(1).optional(),
  advanceBookingDays: z.number().min(0).default(0)
});

// Listing Pricing Schema
export const PricingSchema = z.object({
  basePrice: z.number().min(0),
  currency: z.string().default('AUD'),
  pricingType: z.nativeEnum(PricingType).default(PricingType.DAILY),
  weeklyDiscount: z.number().min(0).max(100).optional(),
  monthlyDiscount: z.number().min(0).max(100).optional(),
  securityDeposit: z.number().min(0).optional(),
  cleaningFee: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  pickupFee: z.number().min(0).optional()
});

// Main Listing Schema
export const ListingSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.nativeEnum(ListingCategory),
  condition: z.nativeEnum(ListingCondition),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  specifications: z.record(z.string()).optional(),
  images: z.array(ListingImageSchema).min(1, 'At least one image is required'),
  pricing: PricingSchema,
  availability: AvailabilitySchema,
  location: z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string().default('Australia'),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    deliveryRadius: z.number().min(0).optional(), // in km
    pickupAvailable: z.boolean().default(true),
    deliveryAvailable: z.boolean().default(false)
  }),
  features: z.array(z.string()).optional(),
  includedItems: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  restrictions: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  status: z.nativeEnum(ListingStatus).default(ListingStatus.DRAFT),
  viewCount: z.number().min(0).default(0),
  favoriteCount: z.number().min(0).default(0),
  bookingCount: z.number().min(0).default(0),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().min(0).default(0),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  featuredUntil: z.string().datetime().optional(),
  lastBookedAt: z.string().datetime().optional()
});

// Listing Creation Schema
export const CreateListingSchema = ListingSchema.omit({
  id: true,
  ownerId: true,
  status: true,
  viewCount: true,
  favoriteCount: true,
  bookingCount: true,
  rating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  lastBookedAt: true
});

// Listing Update Schema
export const UpdateListingSchema = CreateListingSchema.partial();

// Listing Search/Filter Schema
export const ListingFilterSchema = z.object({
  category: z.nativeEnum(ListingCategory).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  condition: z.array(z.nativeEnum(ListingCondition)).optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    radius: z.number().min(0).default(10) // km
  }).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  deliveryAvailable: z.boolean().optional(),
  pickupAvailable: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  sortBy: z.enum(['relevance', 'price_low', 'price_high', 'newest', 'rating', 'distance']).default('relevance'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// Export types
export type Listing = z.infer<typeof ListingSchema>;
export type CreateListing = z.infer<typeof CreateListingSchema>;
export type UpdateListing = z.infer<typeof UpdateListingSchema>;
export type ListingImage = z.infer<typeof ListingImageSchema>;
export type ListingPricing = z.infer<typeof PricingSchema>;
export type ListingAvailability = z.infer<typeof AvailabilitySchema>;
export type ListingFilter = z.infer<typeof ListingFilterSchema>;
export type ListingLocation = Listing['location']; 