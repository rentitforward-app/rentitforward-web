# E2E Testing for Notification System

This directory contains comprehensive end-to-end tests for the Rent It Forward notification system.

## Test Files

### `e2e-notifications.spec.ts`
Comprehensive tests for the notification system including:
- **Badge Behavior**: Tests the timestamp-based unread count logic
- **Email Notifications**: Verifies email notifications for all booking events
- **Push Notifications**: Tests FCM push notification flows
- **Message Notifications**: Tests real-time message notifications
- **Admin Testing Interface**: Tests the admin notification testing tools
- **Environment Validation**: Tests environment configuration validation
- **Notification Preferences**: Tests user preference management
- **Real-time Updates**: Tests live notification badge updates

### `e2e-complete-journey.spec.ts`
Full user journey test covering the complete booking flow.

### `e2e-full-journey.spec.ts`
Additional comprehensive journey testing.

## Test Utilities

### `test-utils.ts`
Extended utility class with notification-specific helpers:
- `setupTestUsers()`: Creates test users and listings
- `createTestBooking()`: Creates a complete booking for testing
- `checkNotificationBadge()`: Validates notification badge behavior
- `triggerNotificationEvent()`: Triggers test notifications via API
- `enablePushNotifications()`: Mocks and enables push notifications
- `sendTestMessage()`: Sends test messages for notification testing
- `checkEmailNotificationSent()`: Validates email notification delivery

## Running Tests

### All Tests
```bash
npm run test
```

### Notification Tests Only
```bash
npx playwright test e2e-notifications.spec.ts
```

### With UI Mode
```bash
npm run test:ui
```

### Debug Mode
```bash
npm run test:debug
```

### Headed Mode (See Browser)
```bash
npm run test:headed
```

## Test Environment Setup

### Required Environment Variables
The tests expect these environment variables to be configured:

#### Email (Resend)
- `RESEND_API_KEY`: Resend API key for email notifications
- `RESEND_FROM_EMAIL`: From email address (optional, defaults to noreply@rentitforward.com.au)

#### Firebase Cloud Messaging (FCM)
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase admin private key
- `FIREBASE_CLIENT_EMAIL`: Firebase admin client email
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase web API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID (public)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: FCM sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase app ID
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: VAPID key for web push

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

#### Stripe
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret

### Database Setup
Ensure the following database migrations have been applied:
- `20241222_add_notifications_last_viewed.sql`: Adds `notifications_last_viewed_at` column to profiles

### Test Data
Tests create temporary users with timestamped emails to avoid conflicts:
- Renter: `renter_{timestamp}@test.com`
- Owner: `owner_{timestamp}@test.com`
- Admin: `admin_{timestamp}@test.com`

## Test Scenarios Covered

### 1. Badge Behavior Test
- Creates users and booking
- Triggers notifications
- Verifies badge shows unread count
- Visits notifications page
- Verifies badge resets to 0

### 2. Email Notification Test
- Tests booking request emails
- Tests booking approval emails
- Tests pickup confirmation emails
- Tests return confirmation emails
- Tests payment notification emails

### 3. Push Notification Test
- Mocks FCM service
- Enables push notifications
- Triggers booking events
- Verifies push notifications are sent

### 4. Message Notification Test
- Creates booking between users
- Sends messages
- Verifies notification badge updates
- Tests email and push notifications for messages

### 5. Admin Testing Interface
- Tests all event types via admin interface
- Verifies email, FCM, and in-app notifications
- Tests batch notification sending

### 6. Environment Validation Test
- Checks admin environment validation page
- Verifies all service configurations are displayed
- Tests configuration status reporting

### 7. Notification Preferences Test
- Tests preference page loading
- Tests toggling email preferences
- Tests toggling push preferences
- Tests saving preferences

### 8. Real-time Updates Test
- Tests live badge count updates
- Simulates notifications from other users
- Verifies real-time UI updates

## Debugging Tests

### View Test Reports
```bash
npm run test:report
```

### Debug Specific Test
```bash
npx playwright test e2e-notifications.spec.ts --debug
```

### Run Single Test Case
```bash
npx playwright test -g "Notification badge shows correct unread count"
```

## Test Best Practices

1. **Isolation**: Each test creates its own users to avoid conflicts
2. **Cleanup**: Tests use timestamped data that doesn't require cleanup
3. **Mocking**: External services (FCM, Stripe) are mocked for reliability
4. **Waiting**: Appropriate waits for async operations and UI updates
5. **Assertions**: Comprehensive assertions for all notification channels
6. **Error Handling**: Graceful handling of missing elements and timeouts

## Troubleshooting

### Common Issues

#### Test Timeouts
- Increase timeout in `playwright.config.ts`
- Add more `waitForTimeout()` calls for slow operations
- Check network conditions and server response times

#### Missing Elements
- Verify data-testid attributes are present in components
- Check element selectors match actual DOM structure
- Ensure proper wait conditions before assertions

#### Environment Issues
- Verify all required environment variables are set
- Check database migrations are applied
- Ensure test database is accessible

#### Notification Issues
- Verify FCM configuration is correct
- Check email service configuration
- Ensure notification permissions are properly mocked

### Debugging Tips

1. Use `--headed` mode to see browser interactions
2. Add `await page.pause()` to stop execution and inspect
3. Use `console.log()` in test utils for debugging
4. Check browser console for JavaScript errors
5. Verify API responses in network tab

## Future Enhancements

- Add visual regression testing for notification UI
- Implement email content validation
- Add performance testing for notification delivery
- Test notification delivery under load
- Add accessibility testing for notification components

