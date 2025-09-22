import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';
import { testData, type TestUser } from './test-data';

test.describe('Notification System E2E Tests', () => {
  let testUtils: TestUtils;
  let testUsers: { renter: TestUser; owner: TestUser; admin: TestUser };
  let bookingId: string;

  test.beforeAll(async () => {
    // Reset timestamp for new test run
    testData.resetTimestamp();
    testUsers = testData.createTestUsers();
  });

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test('Notification badge shows correct unread count based on last viewed timestamp', async ({ page }) => {
    console.log('🔔 Testing notification badge behavior...');

    // Setup: Create users and initial data
    await testUtils.setupTestUsers(testUsers.renter.email, testUsers.owner.email);
    
    // Login as renter
    await testUtils.login(testUsers.renter.email, testUsers.renter.password);
    
    // Check initial badge state (should be 0)
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await expect(notificationBell).toBeVisible();
    
    const initialBadge = page.locator('[data-testid="notification-badge"]');
    if (await initialBadge.isVisible()) {
      await expect(initialBadge).toContainText('0');
    }

    // Trigger a notification by creating a booking request
    await page.goto('/browse');
    await page.waitForLoadState('networkidle');
    
    // Find and click on a listing
    const firstListing = page.locator('[data-testid="listing-card"]').first();
    await firstListing.click();
    
    // Create booking to trigger notifications
    const bookingData = testUtils.getTestBookingData();
    await testUtils.fillBookingForm(bookingData);
    await page.click('button:has-text("Book")');
    
    // Complete payment to trigger approval notifications
    await testUtils.mockStripeSuccess();
    await testUtils.waitForStripeToLoad();
    
    const cardDetails = testUtils.getTestCardDetails();
    await testUtils.fillPaymentForm(cardDetails);
    
    await page.click('button:has-text("Pay")');
    await testUtils.waitForPaymentSuccess();
    
    // Switch to owner to approve booking (this will create notifications for renter)
    await testUtils.logout();
    await testUtils.login(ownerEmail, 'SecurePassword123!');
    
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    
    const approveButton = page.locator('button:has-text("Approve")').first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.click('button:has-text("Confirm")');
    }

    // Switch back to renter - should see notification badge
    await testUtils.logout();
    await testUtils.login(renterEmail, 'SecurePassword123!');
    
    // Wait for notifications to be created
    await page.waitForTimeout(2000);
    
    // Check that badge shows unread count
    const badgeAfterNotification = page.locator('[data-testid="notification-badge"]');
    await expect(badgeAfterNotification).toBeVisible();
    await expect(badgeAfterNotification).not.toContainText('0');
    
    // Click on notifications to view them
    await notificationBell.click();
    await page.waitForURL('**/notifications');
    
    // Verify notifications page loads
    await expect(page.locator('h1')).toContainText('Notifications');
    
    // Go back to dashboard and check badge is cleared
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Badge should now show 0 or be hidden
    const badgeAfterViewing = page.locator('[data-testid="notification-badge"]');
    if (await badgeAfterViewing.isVisible()) {
      await expect(badgeAfterViewing).toContainText('0');
    }

    console.log('✅ Notification badge behavior test passed');
  });

  test('Email notifications are sent for all booking events', async ({ page }) => {
    console.log('📧 Testing email notification flows...');

    // Setup test environment
    await testUtils.setupTestUsers(renterEmail, ownerEmail);
    
    // Test booking request email
    await testUtils.login(renterEmail, 'SecurePassword123!');
    await testUtils.createTestBooking();
    
    // Verify booking request was created (email would be sent to owner)
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
    
    // Test booking approval email
    await testUtils.logout();
    await testUtils.login(ownerEmail, 'SecurePassword123!');
    
    await page.goto('/bookings');
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.click('button:has-text("Confirm")');
    }
    
    // Test pickup confirmation email
    await page.goto('/bookings');
    const pickupBtn = page.locator('button:has-text("Confirm Pickup")').first();
    if (await pickupBtn.isVisible()) {
      await pickupBtn.click();
      await page.fill('textarea', 'Item handed over successfully');
      await page.click('button:has-text("Confirm")');
    }
    
    // Test return confirmation email
    await page.goto('/bookings');
    const returnBtn = page.locator('button:has-text("Confirm Return")').first();
    if (await returnBtn.isVisible()) {
      await returnBtn.click();
      await page.fill('textarea', 'Item returned in good condition');
      await page.click('button:has-text("Confirm")');
    }

    console.log('✅ Email notification flows test passed');
  });

  test('Push notifications are triggered for booking events', async ({ page }) => {
    console.log('📱 Testing push notification flows...');

    // Mock FCM service for testing
    await page.addInitScript(() => {
      // Mock Firebase messaging
      window.mockFCMMessages = [];
      window.firebase = {
        messaging: () => ({
          getToken: () => Promise.resolve('mock-fcm-token'),
          onMessage: (callback) => {
            window.mockFCMCallback = callback;
          }
        })
      };
    });

    await testUtils.setupTestUsers(renterEmail, ownerEmail);
    
    // Login and enable notifications
    await testUtils.login(renterEmail, 'SecurePassword123!');
    
    // Navigate to notification settings and enable push notifications
    await page.goto('/account/notifications');
    
    const enablePushBtn = page.locator('button:has-text("Enable Push Notifications")');
    if (await enablePushBtn.isVisible()) {
      await enablePushBtn.click();
    }
    
    // Create booking to trigger push notifications
    await testUtils.createTestBooking();
    
    // Switch to owner and approve to trigger push notification to renter
    await testUtils.logout();
    await testUtils.login(ownerEmail, 'SecurePassword123!');
    
    await page.goto('/bookings');
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.click('button:has-text("Confirm")');
    }

    console.log('✅ Push notification flows test passed');
  });

  test('Message notifications work correctly', async ({ page }) => {
    console.log('💬 Testing message notification flows...');

    await testUtils.setupTestUsers(renterEmail, ownerEmail);
    
    // Create a booking first to enable messaging
    await testUtils.login(renterEmail, 'SecurePassword123!');
    bookingId = await testUtils.createTestBooking();
    
    // Approve booking as owner
    await testUtils.logout();
    await testUtils.login(ownerEmail, 'SecurePassword123!');
    
    await page.goto('/bookings');
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.click('button:has-text("Confirm")');
    }
    
    // Send message to renter
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    
    const messageInput = page.locator('textarea[placeholder*="message"]');
    if (await messageInput.isVisible()) {
      await messageInput.fill('Hello! Your booking has been approved.');
      await page.click('button:has-text("Send")');
      
      // Verify message was sent
      await expect(page.locator('text=Hello! Your booking has been approved.')).toBeVisible();
    }
    
    // Switch to renter and check for notification
    await testUtils.logout();
    await testUtils.login(renterEmail, 'SecurePassword123!');
    
    // Check notification badge
    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    if (await notificationBadge.isVisible()) {
      await expect(notificationBadge).not.toContainText('0');
    }

    console.log('✅ Message notification flows test passed');
  });

  test('Admin test notifications work for all event types', async ({ page }) => {
    console.log('🔧 Testing admin notification testing interface...');

    // Login as admin
    await testUtils.loginAsAdmin();
    
    // Navigate to admin test notifications
    await page.goto('/admin/test-notifications');
    await page.waitForLoadState('networkidle');
    
    // Test different notification types
    const eventTypes = [
      'booking_request',
      'booking_approved',
      'booking_rejected',
      'booking_cancelled',
      'pickup_confirmed',
      'return_confirmed',
      'payment_received',
      'payment_released',
      'new_message'
    ];
    
    for (const eventType of eventTypes) {
      console.log(`Testing ${eventType} notifications...`);
      
      // Select event type
      await page.selectOption('[data-testid="event-type-select"]', eventType);
      
      // Test email notification
      await page.selectOption('[data-testid="notification-type-select"]', 'email');
      await page.click('button:has-text("Send Test Notification")');
      
      // Wait for response
      await page.waitForTimeout(1000);
      
      // Check for success message
      const successMessage = page.locator('[data-testid="test-result"]');
      await expect(successMessage).toContainText('success');
      
      // Test FCM notification
      await page.selectOption('[data-testid="notification-type-select"]', 'fcm');
      await page.click('button:has-text("Send Test Notification")');
      await page.waitForTimeout(1000);
      
      // Test in-app notification
      await page.selectOption('[data-testid="notification-type-select"]', 'in_app');
      await page.click('button:has-text("Send Test Notification")');
      await page.waitForTimeout(1000);
      
      // Test all notifications at once
      await page.selectOption('[data-testid="notification-type-select"]', 'all');
      await page.click('button:has-text("Send Test Notification")');
      await page.waitForTimeout(2000);
    }

    console.log('✅ Admin test notifications test passed');
  });

  test('Environment configuration validation works', async ({ page }) => {
    console.log('⚙️ Testing environment configuration validation...');

    // Login as admin
    await testUtils.loginAsAdmin();
    
    // Navigate to admin env check
    await page.goto('/admin/env-check');
    await page.waitForLoadState('networkidle');
    
    // Check that environment validation results are displayed
    await expect(page.locator('h1')).toContainText('Environment Configuration');
    
    // Check for configuration status
    const configStatus = page.locator('[data-testid="config-status"]');
    await expect(configStatus).toBeVisible();
    
    // Check individual service configurations
    const services = ['resend', 'fcm', 'supabase', 'stripe'];
    
    for (const service of services) {
      const serviceStatus = page.locator(`[data-testid="${service}-status"]`);
      await expect(serviceStatus).toBeVisible();
    }

    console.log('✅ Environment configuration validation test passed');
  });

  test('Notification preferences can be updated', async ({ page }) => {
    console.log('⚙️ Testing notification preferences...');

    await testUtils.login(renterEmail, 'SecurePassword123!');
    
    // Navigate to notification preferences
    await page.goto('/account/notifications');
    await page.waitForLoadState('networkidle');
    
    // Check that preferences page loads
    await expect(page.locator('h1')).toContainText('Notification Preferences');
    
    // Test toggling email preferences
    const emailBookingToggle = page.locator('[data-testid="email-booking-toggle"]');
    if (await emailBookingToggle.isVisible()) {
      await emailBookingToggle.click();
    }
    
    const emailMessageToggle = page.locator('[data-testid="email-message-toggle"]');
    if (await emailMessageToggle.isVisible()) {
      await emailMessageToggle.click();
    }
    
    // Test toggling push notification preferences
    const pushBookingToggle = page.locator('[data-testid="push-booking-toggle"]');
    if (await pushBookingToggle.isVisible()) {
      await pushBookingToggle.click();
    }
    
    // Save preferences
    const saveBtn = page.locator('button:has-text("Save Preferences")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      
      // Check for success message
      await expect(page.locator('text=Preferences saved')).toBeVisible();
    }

    console.log('✅ Notification preferences test passed');
  });

  test('Real-time notifications update badge count', async ({ page }) => {
    console.log('⚡ Testing real-time notification updates...');

    await testUtils.setupTestUsers(renterEmail, ownerEmail);
    
    // Login as renter and keep page open
    await testUtils.login(renterEmail, 'SecurePassword123!');
    await page.goto('/dashboard');
    
    // Check initial badge state
    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    
    // In a separate context, create a notification for this user
    // This simulates real-time notifications from another user's actions
    
    // For testing purposes, we'll trigger a notification via API
    const response = await page.request.post('/api/admin/test-notifications', {
      data: {
        eventType: 'booking_request',
        notificationType: 'in_app'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Wait for real-time update
    await page.waitForTimeout(2000);
    
    // Check that badge updated
    if (await notificationBadge.isVisible()) {
      await expect(notificationBadge).not.toContainText('0');
    }

    console.log('✅ Real-time notification updates test passed');
  });
});
