import { z } from 'zod';

// User Types
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// User Profile Schema
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  displayName: z.string().optional(),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  bio: z.string().max(500).optional(),
  location: z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string().default('Australia'),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }).optional(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  verificationStatus: z.nativeEnum(VerificationStatus).default(VerificationStatus.UNVERIFIED),
  verificationDocuments: z.array(z.string().url()).optional(),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().min(0).default(0),
  joinedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().optional(),
  preferences: z.object({
    emailNotifications: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    smsNotifications: z.boolean().default(false),
    marketingEmails: z.boolean().default(false)
  }).optional(),
  stripeAccountId: z.string().optional(),
  stripeCustomerId: z.string().optional()
});

// User Update Schema
export const UserUpdateSchema = UserProfileSchema.partial().omit({
  id: true,
  joinedAt: true,
  role: true,
  stripeAccountId: true,
  stripeCustomerId: true
});

// User Registration Schema
export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
});

// User Login Schema
export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

// Export types
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type UserLocation = UserProfile['location']; 