# Firebase Cloud Messaging (FCM) Backend Migration

This document outlines the complete migration from OneSignal to Firebase Cloud Messaging (FCM) for the Rent It Forward web backend.

## Overview

The migration replaces OneSignal with Firebase Cloud Messaging for push notifications across web and mobile platforms. This provides better integration with Firebase ecosystem, improved reliability, and unified notification management.

## Migration Components

### 1. Database Schema Updates

**New Tables:**
- `fcm_subscriptions` - Stores FCM tokens for all platforms
- `app_notifications` - In-app notification center

**Updated Tables:**
- `notification_preferences` - Updated to support FCM preferences
- `notification_logs` - Updated to track FCM messages

**Migration File:** `supabase/migrations/0021_fcm_migration.sql`

### 2. FCM Admin Service

**File:** `src/lib/fcm/admin.ts`

Core server-side FCM implementation using Firebase Admin SDK:
- Token management and validation
- Multi-platform message sending (web, iOS, Android)
- Topic and condition-based messaging
- Automatic cleanup of invalid tokens
- Comprehensive logging and error handling

**Key Features:**
- Platform-specific payload optimization
- Batch sending for multiple tokens
- Topic subscription management
- Invalid token cleanup
- Database integration for logging

### 3. FCM Notification Service

**File:** `src/lib/fcm/notifications.ts`

High-level notification service that replaces OneSignal functionality:
- User preference checking
- Template-based notifications
- Booking workflow integration
- Multi-platform targeting
- In-app notification creation

**Notification Types Supported:**
- Booking requests, confirmations, cancellations
- Payment confirmations and failures
- Message notifications
- Review requests
- System announcements
- Reminders

### 4. API Routes

**Updated Routes:**
- `POST /api/notifications/fcm-token` - Register/update FCM tokens
- `GET /api/notifications/fcm-tokens/[userId]` - Fetch user tokens
- `POST /api/notifications/send` - Send FCM notifications
- `PUT /api/notifications/preferences` - Updated for FCM preferences
- `POST /api/notifications/log` - Updated for FCM logging

**New Functionality:**
- FCM token registration and management
- Platform-specific token handling
- Preference-based notification filtering
- Comprehensive notification logging

### 5. Booking Workflow Integration

**Updated Files:**
- `src/app/api/bookings/[id]/approve/route.ts`
- `src/app/api/bookings/[id]/reject/route.ts`
- `src/app/api/bookings/authorize/route.ts`
- `src/app/bookings/[id]/payment/success/page.tsx`

**Changes:**
- Replaced OneSignal calls with FCM notifications
- Updated notification data structure
- Improved error handling
- Added in-app notification creation

## Environment Variables

### Required FCM Variables

```env
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Firebase Client SDK (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

### Deprecated Variables

```env
# These are no longer needed after migration
# NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
# ONESIGNAL_API_KEY=your_onesignal_api_key
```

## Setup Instructions

### 1. Firebase Project Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Cloud Messaging in the Firebase console
3. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

### 2. Environment Configuration

1. Extract values from the service account JSON:
   ```json
   {
     "project_id": "your-project-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com"
   }
   ```

2. Get client-side config from Firebase console:
   - Go to Project Settings → General
   - Scroll to "Your apps" section
   - Copy the config object values

3. Update your `.env.local` file with the FCM variables

### 3. Database Migration

Run the migration to update your database schema:

```bash
# Apply the migration
supabase db push

# Or if using migrations directly
psql -d your_database -f supabase/migrations/0021_fcm_migration.sql
```

### 4. Dependencies

The FCM implementation requires these dependencies:

```json
{
  "firebase-admin": "^12.0.0"
}
```

Install with:
```bash
npm install firebase-admin
```

## API Usage Examples

### Register FCM Token

```typescript
// Register a new FCM token
const response = await fetch('/api/notifications/fcm-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fcm_token: 'user_fcm_token_here',
    platform: 'web', // or 'ios', 'android'
    device_type: 'web',
    device_id: 'unique_device_id',
    app_version: '1.0.0'
  })
});
```

### Send Notification

```typescript
// Send a typed notification
const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send_typed',
    user_id: 'user_uuid',
    type: 'booking_confirmed',
    context: {
      booking_id: 'booking_uuid',
      item_title: 'Camera Lens',
      start_date: '2024-01-01'
    },
    priority: 'high',
    platforms: ['web', 'mobile']
  })
});
```

### Update Preferences

```typescript
// Update notification preferences
const response = await fetch('/api/notifications/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    preferences: {
      booking_notifications: true,
      message_notifications: true,
      payment_notifications: true,
      review_notifications: true,
      system_notifications: true,
      marketing_notifications: false,
      push_notifications: true,
      email_enabled: true,
      fcm_web_enabled: true,
      fcm_mobile_enabled: true
    }
  })
});
```

## Notification Types

### Booking Notifications

```typescript
// Booking request
await FCMBookingNotifications.notifyOwnerBookingRequest(
  ownerId,
  bookingId,
  listingTitle,
  renterName
);

// Booking approved
await FCMBookingNotifications.notifyRenterBookingApproved(
  renterId,
  bookingId,
  listingTitle
);

// Booking rejected
await FCMBookingNotifications.notifyRenterBookingRejected(
  renterId,
  bookingId,
  listingTitle,
  reason
);

// Payment confirmed
await FCMBookingNotifications.notifyPaymentConfirmed(
  userId,
  bookingId,
  listingTitle,
  amount
);
```

### Message Notifications

```typescript
// New message received
await FCMBookingNotifications.notifyMessageReceived(
  userId,
  messageId,
  itemTitle,
  senderName
);
```

### System Notifications

```typescript
// System announcement
await FCMBookingNotifications.notifySystemAnnouncement(
  userId,
  announcementText
);

// Reminder
await FCMBookingNotifications.notifyReminder(
  userId,
  reminderText
);
```

## Platform-Specific Features

### Web Notifications

- Service Worker integration
- Click actions for deep linking
- Rich notifications with images
- Action buttons
- Badge updates

### Mobile Notifications (iOS/Android)

- Platform-specific payload optimization
- Notification channels (Android)
- Notification categories (iOS)
- Badge count management
- Background notification handling

## Error Handling

The FCM implementation includes comprehensive error handling:

1. **Invalid Tokens**: Automatically detected and marked as inactive
2. **Network Errors**: Logged and retried where appropriate
3. **Permission Errors**: Gracefully handled with user feedback
4. **Rate Limiting**: Built-in backoff and retry logic

## Monitoring and Analytics

### Notification Logs

All notifications are logged in the `notification_logs` table with:
- Delivery status tracking
- Error message logging
- Platform-specific metrics
- User engagement tracking

### Database Functions

- `get_user_fcm_tokens(uuid)` - Get active tokens for a user
- `get_unread_notification_count(uuid)` - Get unread count
- `cleanup_inactive_fcm_tokens()` - Clean up old tokens
- `should_send_notification(uuid, text, text)` - Check preferences

## Migration Checklist

- [ ] Firebase project created and configured
- [ ] Environment variables updated
- [ ] Database migration applied
- [ ] Dependencies installed
- [ ] FCM service account configured
- [ ] Web client updated (separate task)
- [ ] Mobile app updated (already completed)
- [ ] OneSignal references removed
- [ ] Testing completed
- [ ] Production deployment

## Testing

### Unit Tests

Test the FCM service functionality:

```typescript
// Test token registration
describe('FCM Token Registration', () => {
  it('should register a new FCM token', async () => {
    // Test implementation
  });
});

// Test notification sending
describe('FCM Notification Sending', () => {
  it('should send notification to valid tokens', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test the complete notification flow:

1. Register FCM token
2. Update notification preferences
3. Trigger notification event
4. Verify notification delivery
5. Check in-app notification creation

## Performance Considerations

1. **Batch Processing**: Send notifications in batches for better performance
2. **Token Cleanup**: Regular cleanup of inactive tokens
3. **Database Indexing**: Proper indexes on FCM tables
4. **Caching**: Cache user preferences for better performance
5. **Rate Limiting**: Respect FCM rate limits

## Security Considerations

1. **Token Validation**: Validate FCM tokens before storage
2. **User Authorization**: Ensure users can only manage their own tokens
3. **Service Account**: Secure storage of Firebase service account key
4. **Rate Limiting**: Prevent notification spam
5. **Data Privacy**: Handle user data according to privacy policies

## Troubleshooting

### Common Issues

1. **Invalid Service Account**: Check Firebase service account configuration
2. **Token Registration Fails**: Verify client-side Firebase configuration
3. **Notifications Not Delivered**: Check user preferences and token validity
4. **Database Errors**: Verify migration was applied correctly

### Debug Commands

```bash
# Check FCM tokens for a user
SELECT * FROM fcm_subscriptions WHERE user_id = 'user_uuid';

# Check notification preferences
SELECT * FROM notification_preferences WHERE user_id = 'user_uuid';

# Check notification logs
SELECT * FROM notification_logs WHERE user_id = 'user_uuid' ORDER BY created_at DESC;

# Check app notifications
SELECT * FROM app_notifications WHERE user_id = 'user_uuid' AND is_read = false;
```

## Next Steps

1. **Web Client Migration**: Update web client to use FCM for browser notifications
2. **Advanced Features**: Implement notification scheduling and advanced targeting
3. **Analytics**: Add comprehensive notification analytics
4. **A/B Testing**: Implement notification A/B testing capabilities
5. **Optimization**: Performance optimization and monitoring

## Support

For issues or questions regarding the FCM migration:

1. Check the Firebase Console for delivery metrics
2. Review notification logs in the database
3. Check server logs for FCM errors
4. Verify environment configuration
5. Test with different platforms and devices

---

**Migration Status**: ✅ Backend Complete - Web Client Pending

**Last Updated**: December 2024

