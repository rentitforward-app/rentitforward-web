# Firebase Cloud Messaging (FCM) Web Implementation

This document outlines the complete FCM implementation for the Rent It Forward web application, replacing the previous OneSignal integration.

## Overview

The web application now uses Firebase Cloud Messaging (FCM) for browser push notifications, providing:
- Cross-browser push notification support
- Real-time notification delivery
- User preference management
- Integration with the mobile app's notification system
- Centralized notification logging and analytics

## Architecture

### Client-Side Components

#### 1. Firebase Configuration (`src/lib/fcm/client.ts`)
- Initializes Firebase SDK with project configuration
- Configures Firebase Messaging for web push notifications
- Uses environment variables for secure configuration

#### 2. FCM Provider (`src/components/FCMProvider.tsx`)
- React context provider for FCM functionality
- Manages FCM token registration and updates
- Handles notification permissions
- Provides hooks for components to access FCM features

#### 3. Service Worker (`public/firebase-messaging-sw.js`)
- Handles background push notifications
- Processes notification clicks and actions
- Manages notification display when app is not active

#### 4. Notification Settings Component (`src/components/notifications/NotificationSettings.tsx`)
- User interface for managing notification preferences
- Permission request handling
- Platform-specific settings (web/mobile)
- Real-time preference updates

### Server-Side Components

#### 1. FCM Admin Service (`src/lib/fcm/admin.ts`)
- Firebase Admin SDK integration
- Server-side notification sending
- Token validation and management
- Batch notification support

#### 2. FCM Notification Service (`src/lib/fcm/notifications.ts`)
- High-level notification service
- Booking-specific notification templates
- User preference filtering
- Database logging integration

#### 3. API Routes
- `/api/notifications/fcm-token` - Token registration/unregistration
- `/api/notifications/fcm-tokens/[userId]` - User token retrieval
- `/api/notifications/send` - Send notifications endpoint
- `/api/notifications/preferences` - Preference management
- `/api/notifications/unread-count` - Unread notification count

## Database Schema

### FCM Subscriptions Table
```sql
CREATE TABLE fcm_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### App Notifications Table
```sql
CREATE TABLE app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  data JSONB,
  priority INTEGER DEFAULT 5,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Updated Notification Preferences
```sql
ALTER TABLE notification_preferences 
ADD COLUMN push_notifications BOOLEAN DEFAULT true,
ADD COLUMN fcm_web_enabled BOOLEAN DEFAULT true,
ADD COLUMN fcm_mobile_enabled BOOLEAN DEFAULT true;
```

## Environment Variables

### Client-Side (Public)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Server-Side (Private)
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
```

## Usage Examples

### Sending a Notification
```typescript
import { FCMBookingNotifications } from '@/lib/fcm/notifications';

// Send booking confirmation
await FCMBookingNotifications.notifyRenterBookingApproved(
  renterId,
  bookingId,
  listingTitle
);
```

### Managing User Preferences
```typescript
import { useFCM, useNotificationPreferences } from '@/components/FCMProvider';

function MyComponent() {
  const fcm = useFCM();
  const { preferences, updatePreferences } = useNotificationPreferences();
  
  const handleToggleBookingNotifications = async () => {
    await updatePreferences({
      ...preferences,
      booking_notifications: !preferences.booking_notifications
    });
  };
}
```

### Requesting Notification Permission
```typescript
import { useNotificationPermission } from '@/components/FCMProvider';

function NotificationButton() {
  const { permission, requestPermission } = useNotificationPermission();
  
  const handleRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      console.log('Notifications enabled!');
    }
  };
}
```

## Notification Types

### Booking Notifications
- `booking_request` - New booking request for item owner
- `booking_approved` - Booking approved for renter
- `booking_rejected` - Booking rejected for renter
- `booking_completed` - Booking completed for both parties
- `payment_confirmed` - Payment processed successfully

### Message Notifications
- `new_message` - New chat message received
- `message_reply` - Reply to previous message

### System Notifications
- `system_update` - Platform updates and announcements
- `security_alert` - Security-related notifications

## Permission Handling

### Browser Compatibility
- Chrome 42+
- Firefox 44+
- Safari 16+ (with limitations)
- Edge 17+

### Permission States
- `granted` - User has granted notification permission
- `denied` - User has denied notification permission
- `default` - User hasn't made a decision yet

### Permission Request Flow
1. Check current permission status
2. If `default`, show permission request UI
3. Call `Notification.requestPermission()`
4. Handle permission result
5. Register FCM token if granted

## Testing

### Development Testing
1. Use the notification settings page to enable notifications
2. Use browser developer tools to simulate notifications
3. Test with different permission states
4. Verify token registration in database

### Production Testing
1. Test across different browsers
2. Verify HTTPS requirement is met
3. Test notification delivery and click handling
4. Monitor error logs and delivery rates

## Security Considerations

### Client-Side Security
- Firebase configuration keys are public by design
- Security is enforced by Firebase Security Rules
- App Check can be implemented for additional security

### Server-Side Security
- Private key must be kept secure
- Use environment variables for sensitive data
- Validate all incoming requests
- Implement rate limiting

### Database Security
- Row Level Security (RLS) enabled
- Users can only access their own notifications
- Admin functions require proper authentication

## Migration from OneSignal

### Removed Components
- `OneSignalProvider.tsx` - Replaced with `FCMProvider.tsx`
- OneSignal SDK scripts - Replaced with Firebase service worker
- OneSignal API calls - Replaced with FCM API calls

### Updated Components
- `NotificationSettings.tsx` - Updated to use FCM hooks
- `Providers.tsx` - Uses FCMProvider instead of OneSignalProvider
- `layout.tsx` - Firebase service worker registration

### Database Migration
- Applied `0021_fcm_migration.sql` to update schema
- Migrated existing notification preferences
- Added new FCM-specific tables

## Monitoring and Analytics

### Notification Logs
All notifications are logged in the `notification_logs` table with:
- FCM message ID for tracking
- Delivery status
- Error messages
- Platform information

### Metrics to Monitor
- Token registration success rate
- Notification delivery rate
- Click-through rates
- Permission grant rates
- Error rates by browser/platform

## Troubleshooting

### Common Issues

#### Notifications Not Received
1. Check browser notification permissions
2. Verify FCM token registration
3. Check service worker registration
4. Verify Firebase configuration

#### Permission Denied
1. Clear browser data and retry
2. Check if notifications are blocked site-wide
3. Verify HTTPS is being used
4. Check browser compatibility

#### Service Worker Issues
1. Verify `firebase-messaging-sw.js` is accessible
2. Check service worker registration in DevTools
3. Ensure proper MIME type for service worker file

### Debug Tools
- Browser DevTools → Application → Service Workers
- Browser DevTools → Application → Storage → IndexedDB
- Firebase Console → Cloud Messaging
- Network tab for API calls

## Future Enhancements

### Planned Features
- Rich notifications with images and actions
- Notification scheduling
- A/B testing for notification content
- Advanced analytics and reporting
- Web push notification categories

### Performance Optimizations
- Token refresh handling
- Batch notification sending
- Notification deduplication
- Offline notification queuing

## Support

For issues related to FCM implementation:
1. Check Firebase Console for errors
2. Review browser console logs
3. Verify environment variables
4. Check database logs
5. Test with different browsers/devices

## References

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
