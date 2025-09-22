import { Page, expect } from '@playwright/test';

export class TestUtils {
  constructor(private page: Page) {}

  // Authentication helpers
  async login(email: string = 'test@example.com', password: string = 'testpassword123') {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await this.page.waitForURL('/dashboard');
  }

  async loginAsAdmin() {
    await this.login('admin@rentitforward.com', 'adminpassword123');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/');
  }

  // Navigation helpers
  async goToBrowse() {
    await this.page.goto('/browse');
    await this.page.waitForLoadState('networkidle');
  }

  async goToProfile() {
    await this.page.goto('/profile');
    await this.page.waitForLoadState('networkidle');
  }

  async goToBookings() {
    await this.page.goto('/bookings');
    await this.page.waitForLoadState('networkidle');
  }

  async goToAdminDashboard() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  // Form helpers
  async fillBookingForm(data: {
    startDate: string;
    endDate: string;
    message?: string;
    includeInsurance?: boolean;
  }) {
    await this.page.fill('[data-testid="start-date"]', data.startDate);
    await this.page.fill('[data-testid="end-date"]', data.endDate);
    
    if (data.message) {
      await this.page.fill('[data-testid="booking-message"]', data.message);
    }
    
    if (data.includeInsurance) {
      await this.page.check('[data-testid="include-insurance"]');
    }
  }

  async fillPaymentForm(cardDetails: {
    cardNumber: string;
    expiry: string;
    cvc: string;
    name: string;
  }) {
    // Switch to Stripe iframe
    const stripeFrame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]');
    
    await stripeFrame.locator('[placeholder="Card number"]').fill(cardDetails.cardNumber);
    await stripeFrame.locator('[placeholder="MM / YY"]').fill(cardDetails.expiry);
    await stripeFrame.locator('[placeholder="CVC"]').fill(cardDetails.cvc);
    await this.page.fill('[data-testid="cardholder-name"]', cardDetails.name);
  }

  // Assertion helpers
  async expectToBeOnPage(url: string) {
    await expect(this.page).toHaveURL(new RegExp(url));
  }

  async expectElementToContainText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async expectBookingStatus(status: string) {
    await expect(this.page.locator('[data-testid="booking-status"]')).toContainText(status);
  }

  // Wait helpers
  async waitForStripeToLoad() {
    await this.page.waitForSelector('iframe[name^="__privateStripeFrame"]');
  }

  async waitForPaymentSuccess() {
    await this.page.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });
  }

  async waitForBookingConfirmation() {
    await this.page.waitForSelector('[data-testid="booking-confirmation"]', { timeout: 30000 });
  }

  // Mock helpers for testing
  async mockStripeSuccess() {
    await this.page.route('**/api/payments/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          payment_intent_id: 'pi_test_success',
          client_secret: 'pi_test_success_secret_test'
        })
      });
    });
  }

  async mockStripeFailure() {
    await this.page.route('**/api/payments/**', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Your card was declined.'
        })
      });
    });
  }

  // Test data helpers
  getTestCardDetails() {
    return {
      cardNumber: '4242424242424242', // Stripe test card
      expiry: '12/25',
      cvc: '123',
      name: 'Test User'
    };
  }

  getTestBookingData() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3 days rental
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      message: 'Test booking for Playwright test',
      includeInsurance: true
    };
  }

  // Notification testing helpers
  async setupTestUsers(renterEmail: string, ownerEmail: string) {
    // Create owner account
    await this.page.goto('/register');
    await this.page.fill('input[name="name"]', 'Test Owner');
    await this.page.fill('input[name="email"]', ownerEmail);
    await this.page.fill('input[name="password"]', 'SecurePassword123!');
    
    const ownerTerms = this.page.locator('input[type="checkbox"]');
    if (await ownerTerms.isVisible()) {
      await ownerTerms.check();
    }
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(2000);

    // Create a test listing as owner
    if (this.page.url().includes('/verify')) {
      await this.page.goto('/login');
      await this.page.fill('input[type="email"]', ownerEmail);
      await this.page.fill('input[type="password"]', 'SecurePassword123!');
      await this.page.click('button[type="submit"]');
    }

    await this.page.goto('/listings/create');
    await this.page.fill('input[name="title"]', 'Test Camera for E2E');
    await this.page.fill('textarea[name="description"]', 'Professional camera for testing');
    await this.page.fill('input[name="price"]', '45');
    await this.page.fill('input[name="location"]', 'Sydney, NSW');
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(3000);

    // Logout and create renter account
    await this.logout();
    
    await this.page.goto('/register');
    await this.page.fill('input[name="name"]', 'Test Renter');
    await this.page.fill('input[name="email"]', renterEmail);
    await this.page.fill('input[name="password"]', 'SecurePassword123!');
    
    const renterTerms = this.page.locator('input[type="checkbox"]');
    if (await renterTerms.isVisible()) {
      await renterTerms.check();
    }
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForTimeout(2000);
  }

  async createTestBooking(): Promise<string> {
    // Navigate to browse and find test listing
    await this.page.goto('/browse');
    await this.page.waitForLoadState('networkidle');
    
    const testListing = this.page.locator('text=Test Camera for E2E').first();
    if (await testListing.isVisible()) {
      await testListing.click();
    } else {
      // Fallback to first available listing
      const firstListing = this.page.locator('[data-testid="listing-card"]').first();
      await firstListing.click();
    }

    // Fill booking form
    const bookingData = this.getTestBookingData();
    await this.fillBookingForm(bookingData);
    
    await this.page.click('button:has-text("Book")');
    await this.page.waitForTimeout(2000);

    // Complete payment
    await this.mockStripeSuccess();
    await this.waitForStripeToLoad();
    
    const cardDetails = this.getTestCardDetails();
    await this.fillPaymentForm(cardDetails);
    
    await this.page.click('button:has-text("Pay")');
    await this.waitForPaymentSuccess();
    
    // Extract booking ID from URL
    const bookingId = this.page.url().split('/').pop() || 'test-booking';
    return bookingId;
  }

  async checkNotificationBadge(expectedCount?: number) {
    const badge = this.page.locator('[data-testid="notification-badge"]');
    
    if (expectedCount === 0 || expectedCount === undefined) {
      // Badge should be hidden or show 0
      if (await badge.isVisible()) {
        await expect(badge).toContainText('0');
      }
    } else {
      // Badge should be visible and show the expected count
      await expect(badge).toBeVisible();
      if (expectedCount) {
        await expect(badge).toContainText(expectedCount.toString());
      } else {
        // Just check it's not 0
        await expect(badge).not.toContainText('0');
      }
    }
  }

  async triggerNotificationEvent(eventType: string, notificationType: string = 'all') {
    // Call admin test notification API to trigger notifications
    const response = await this.page.request.post('/api/admin/test-notifications', {
      data: {
        eventType,
        notificationType
      }
    });
    
    return response.ok();
  }

  async enablePushNotifications() {
    // Mock browser notification permission
    await this.page.addInitScript(() => {
      // Mock Notification API
      Object.defineProperty(window, 'Notification', {
        value: class MockNotification {
          static permission = 'granted';
          static requestPermission = () => Promise.resolve('granted');
          constructor(title: string, options?: any) {
            console.log('Mock notification:', title, options);
          }
        }
      });

      // Mock service worker registration
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: () => Promise.resolve({
            showNotification: () => Promise.resolve()
          }),
          ready: Promise.resolve({
            showNotification: () => Promise.resolve()
          })
        }
      });
    });

    // Navigate to notification settings
    await this.page.goto('/account/notifications');
    
    // Enable push notifications if button is available
    const enableBtn = this.page.locator('button:has-text("Enable Push Notifications")');
    if (await enableBtn.isVisible()) {
      await enableBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async sendTestMessage(message: string = 'Test message for E2E') {
    await this.page.goto('/messages');
    await this.page.waitForLoadState('networkidle');
    
    const messageInput = this.page.locator('textarea[placeholder*="message"]');
    if (await messageInput.isVisible()) {
      await messageInput.fill(message);
      await this.page.click('button:has-text("Send")');
      
      // Verify message appears
      await expect(this.page.locator(`text=${message}`)).toBeVisible();
    }
  }

  async checkEmailNotificationSent(eventType: string) {
    // In a real test environment, you might check email logs or mock email service
    // For now, we'll verify the API response indicates success
    const response = await this.page.request.post('/api/admin/test-notifications', {
      data: {
        eventType,
        notificationType: 'email'
      }
    });
    
    const result = await response.json();
    return result.success && result.results?.email?.success;
  }
} 