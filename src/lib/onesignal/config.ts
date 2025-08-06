/**
 * OneSignal Configuration for Web Push Notifications
 * 
 * Handles web browser push notification setup and management
 * Integrates with the booking workflow for real-time updates
 */

// OneSignal configuration
export const ONESIGNAL_CONFIG = {
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
  safariWebId: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID || '',
  allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
  requiresUserPrivacyConsent: false,
  promptOptions: {
    slidedown: {
      prompts: [
        {
          type: 'push',
          autoPrompt: false,
          text: {
            actionMessage: 'Get notified about your booking updates and rental reminders',
            acceptButton: 'Allow',
            cancelButton: 'No Thanks',
          },
        },
      ],
    },
  },
} as const;

// Notification categories for the booking workflow
export const NOTIFICATION_CATEGORIES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_APPROVED: 'booking_approved', 
  BOOKING_REJECTED: 'booking_rejected',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PICKUP_REMINDER: 'pickup_reminder',
  RETURN_REMINDER: 'return_reminder',
  RENTAL_COMPLETED: 'rental_completed',
  OWNER_PAYOUT: 'owner_payout',
  SYSTEM_ALERT: 'system_alert',
} as const;

// Notification priority levels
export const NOTIFICATION_PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
} as const;

// Default notification settings
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  bookingUpdates: true,
  paymentUpdates: true,
  rentalReminders: true,
  marketingNotifications: false,
  emailBackup: true,
} as const;

export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[keyof typeof NOTIFICATION_CATEGORIES];
export type NotificationPriority = typeof NOTIFICATION_PRIORITY[keyof typeof NOTIFICATION_PRIORITY];
export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFERENCES;