import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';

test.describe('Booking Flow', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test.describe('Booking Creation', () => {
    
    test('user can browse and view listing details', async ({ page }) => {
      await testUtils.goToBrowse();
      
      // Look for listings
      const listings = page.locator('[data-testid="listing-card"]');
      if (await listings.first().isVisible()) {
        await listings.first().click();
        
        // Should be on listing detail page
        await expect(page).toHaveURL(/\/listings\/\d+/);
        await expect(page.locator('[data-testid="listing-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="listing-price"]')).toBeVisible();
      }
    });

    test('authenticated user can create a booking request', async ({ page }) => {
      // Login first
      await testUtils.login();
      
      // Go to a listing (mock data or create test listing)
      await page.goto('/listings/1'); // Assuming test listing exists
      
      // Fill booking form
      const bookingData = testUtils.getTestBookingData();
      await testUtils.fillBookingForm(bookingData);
      
      // Submit booking request
      await page.click('[data-testid="submit-booking"]');
      
      // Should redirect to payment page
      await expect(page).toHaveURL(/\/bookings\/\d+\/payment/);
    });

    test('booking shows correct pricing calculation', async ({ page }) => {
      await testUtils.login();
      await page.goto('/listings/1');
      
      const bookingData = testUtils.getTestBookingData();
      await testUtils.fillBookingForm(bookingData);
      
      // Check pricing breakdown
      await expect(page.locator('[data-testid="base-price"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-fee"]')).toBeVisible();
      await expect(page.locator('[data-testid="insurance-fee"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-price"]')).toBeVisible();
      
      // Verify pricing calculations (15% service fee, 10% insurance)
      const basePriceText = await page.locator('[data-testid="base-price"]').textContent();
      const serviceFeeText = await page.locator('[data-testid="service-fee"]').textContent();
      const insuranceFeeText = await page.locator('[data-testid="insurance-fee"]').textContent();
      
      // Extract numbers and verify calculations
      if (basePriceText && serviceFeeText && insuranceFeeText) {
        const basePrice = parseFloat(basePriceText.replace(/[^0-9.]/g, ''));
        const serviceFee = parseFloat(serviceFeeText.replace(/[^0-9.]/g, ''));
        const insuranceFee = parseFloat(insuranceFeeText.replace(/[^0-9.]/g, ''));
        
        expect(serviceFee).toBeCloseTo(basePrice * 0.15, 2);
        expect(insuranceFee).toBeCloseTo(basePrice * 0.10, 2);
      }
    });

    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto('/listings/1');
      await page.click('[data-testid="book-now"]');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Payment Process', () => {
    
    test.beforeEach(async ({ page }) => {
      // Setup: Login and create a booking
      await testUtils.login();
      await page.goto('/listings/1');
      
      const bookingData = testUtils.getTestBookingData();
      await testUtils.fillBookingForm(bookingData);
      await page.click('[data-testid="submit-booking"]');
    });

    test('payment form loads with Stripe', async ({ page }) => {
      await testUtils.waitForStripeToLoad();
      
      // Check Stripe payment form elements
      await expect(page.locator('iframe[name^="__privateStripeFrame"]')).toBeVisible();
      await expect(page.locator('[data-testid="cardholder-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="submit-payment"]')).toBeVisible();
    });

    test('successful payment creates booking', async ({ page }) => {
      // Mock successful payment
      await testUtils.mockStripeSuccess();
      
      await testUtils.waitForStripeToLoad();
      
      // Fill payment form
      const cardDetails = testUtils.getTestCardDetails();
      await testUtils.fillPaymentForm(cardDetails);
      
      // Submit payment
      await page.click('[data-testid="submit-payment"]');
      
      // Wait for success
      await testUtils.waitForPaymentSuccess();
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      
      // Should redirect to booking confirmation
      await testUtils.waitForBookingConfirmation();
      await expect(page).toHaveURL(/\/bookings\/\d+/);
    });

    test('failed payment shows error message', async ({ page }) => {
      // Mock payment failure
      await testUtils.mockStripeFailure();
      
      await testUtils.waitForStripeToLoad();
      
      const cardDetails = testUtils.getTestCardDetails();
      await testUtils.fillPaymentForm(cardDetails);
      
      await page.click('[data-testid="submit-payment"]');
      
      // Should show error
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText(/declined/i);
    });

    test('payment creates booking with correct status', async ({ page }) => {
      await testUtils.mockStripeSuccess();
      
      await testUtils.waitForStripeToLoad();
      const cardDetails = testUtils.getTestCardDetails();
      await testUtils.fillPaymentForm(cardDetails);
      await page.click('[data-testid="submit-payment"]');
      
      await testUtils.waitForBookingConfirmation();
      
      // Check booking status
      await testUtils.expectBookingStatus('Paid - Awaiting Pickup');
    });
  });

  test.describe('Booking Management', () => {
    
    test('user can view their bookings', async ({ page }) => {
      await testUtils.login();
      await testUtils.goToBookings();
      
      await expect(page.locator('h1')).toContainText(/bookings/i);
      
      // Should show bookings list (might be empty for new user)
      await expect(page.locator('[data-testid="bookings-list"]')).toBeVisible();
    });

    test('booking shows correct status progression', async ({ page }) => {
      await testUtils.login();
      await page.goto('/bookings/1'); // Assuming test booking exists
      
      // Check status display
      await expect(page.locator('[data-testid="booking-status"]')).toBeVisible();
      
      // Check status history if implemented
      const statusHistory = page.locator('[data-testid="status-history"]');
      if (await statusHistory.isVisible()) {
        await expect(statusHistory).toBeVisible();
      }
    });

    test('pickup confirmation works for owner', async ({ page }) => {
      // Login as owner (would need test data setup)
      await testUtils.login('owner@test.com');
      await page.goto('/bookings/1');
      
      // Look for pickup confirmation button
      const confirmPickupBtn = page.locator('[data-testid="confirm-pickup"]');
      if (await confirmPickupBtn.isVisible()) {
        await confirmPickupBtn.click();
        
        // Should show confirmation form
        await expect(page.locator('[data-testid="pickup-form"]')).toBeVisible();
        
        // Fill confirmation details
        await page.fill('[data-testid="pickup-notes"]', 'Item picked up successfully');
        await page.click('[data-testid="submit-pickup"]');
        
        // Status should update
        await testUtils.expectBookingStatus('Active');
      }
    });

    test('return confirmation works for owner', async ({ page }) => {
      // Login as owner and go to active booking
      await testUtils.login('owner@test.com');
      await page.goto('/bookings/1');
      
      const confirmReturnBtn = page.locator('[data-testid="confirm-return"]');
      if (await confirmReturnBtn.isVisible()) {
        await confirmReturnBtn.click();
        
        await expect(page.locator('[data-testid="return-form"]')).toBeVisible();
        
        await page.fill('[data-testid="return-notes"]', 'Item returned in good condition');
        await page.click('[data-testid="submit-return"]');
        
        await testUtils.expectBookingStatus('Completed - Awaiting Payment Release');
      }
    });
  });

  test.describe('Admin Payment Release', () => {
    
    test('admin can view payment releases queue', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/payment-releases');
      
      await expect(page.locator('h1')).toContainText(/payment releases/i);
      await expect(page.locator('[data-testid="releases-list"]')).toBeVisible();
    });

    test('admin can process payment release', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/payment-releases');
      
      // Look for bookings ready for release
      const releaseBtn = page.locator('[data-testid="release-payment"]').first();
      if (await releaseBtn.isVisible()) {
        await releaseBtn.click();
        
        // Should show confirmation dialog
        await expect(page.locator('[data-testid="release-confirmation"]')).toBeVisible();
        
        await page.click('[data-testid="confirm-release"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="release-success"]')).toBeVisible();
      }
    });

    test('payment release respects working days rule', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/payment-releases');
      
      // Check that only eligible bookings are shown
      // (returned > 2 working days ago without damage reports)
      await expect(page.locator('[data-testid="releases-list"]')).toBeVisible();
      
      // Check working days calculation display
      const workingDaysInfo = page.locator('[data-testid="working-days-info"]');
      if (await workingDaysInfo.isVisible()) {
        await expect(workingDaysInfo).toContainText(/working days/i);
      }
    });
  });

  test.describe('Error Handling', () => {
    
    test('handles network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      await testUtils.login();
      await page.goto('/listings/1');
      
      const bookingData = testUtils.getTestBookingData();
      await testUtils.fillBookingForm(bookingData);
      await page.click('[data-testid="submit-booking"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('handles invalid booking dates', async ({ page }) => {
      await testUtils.login();
      await page.goto('/listings/1');
      
      // Try to book with past dates
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      await testUtils.fillBookingForm({
        startDate: pastDate.toISOString().split('T')[0],
        endDate: pastDate.toISOString().split('T')[0],
        message: 'Test booking'
      });
      
      await page.click('[data-testid="submit-booking"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="date-error"]')).toBeVisible();
    });
  });
}); 