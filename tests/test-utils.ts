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
} 