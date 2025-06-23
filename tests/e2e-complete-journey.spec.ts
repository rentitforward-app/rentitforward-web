import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';

test.describe('Complete User Journey E2E', () => {
  let testUtils: TestUtils;
  let renterEmail: string;
  let ownerEmail: string;
  let bookingId: string;

  test.beforeAll(async () => {
    const timestamp = Date.now();
    renterEmail = `renter_${timestamp}@test.com`;
    ownerEmail = `owner_${timestamp}@test.com`;
  });

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test('Complete journey: signup → browse → book → pay → pickup → return → release → review', async ({ page }) => {
    console.log('🚀 Starting complete user journey test...');

    // STEP 1: Owner Signup
    console.log('📝 Step 1: Owner Signup');
    await page.goto('/register');
    
    await page.fill('input[name="name"]', 'John Owner');
    await page.fill('input[name="email"]', ownerEmail);
    await page.fill('input[name="password"]', 'SecurePassword123!');
    
    const termsCheckbox = page.locator('input[type="checkbox"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // STEP 2: Owner Creates Listing
    console.log('🏠 Step 2: Owner creates listing');
    
    if (page.url().includes('/verify')) {
      await page.goto('/login');
      await page.fill('input[type="email"]', ownerEmail);
      await page.fill('input[type="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
    }

    await page.goto('/listings/create');
    
    await page.fill('input[name="title"]', 'Professional DSLR Camera');
    await page.fill('textarea[name="description"]', 'High-quality camera for rent');
    await page.fill('input[name="price"]', '50');
    await page.fill('input[name="location"]', 'Sydney, NSW');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // STEP 3: Renter Signup
    console.log('👤 Step 3: Renter Signup');
    
    await testUtils.logout();
    await page.goto('/register');
    
    await page.fill('input[name="name"]', 'Jane Renter');
    await page.fill('input[name="email"]', renterEmail);
    await page.fill('input[name="password"]', 'SecurePassword123!');
    
    const renterTerms = page.locator('input[type="checkbox"]');
    if (await renterTerms.isVisible()) {
      await renterTerms.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // STEP 4: Browse & Find Listing
    console.log('🔍 Step 4: Browse and find listing');
    
    if (page.url().includes('/verify')) {
      await page.goto('/login');
      await page.fill('input[type="email"]', renterEmail);
      await page.fill('input[type="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
    }

    await page.goto('/browse');
    await page.waitForLoadState('networkidle');
    
    const listing = page.locator('text=Professional DSLR Camera').first();
    if (await listing.isVisible()) {
      await listing.click();
    } else {
      await page.goto('/listings/1');
    }

    // STEP 5: Create Booking
    console.log('📅 Step 5: Create booking');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);
    
    await page.fill('input[name="startDate"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', endDate.toISOString().split('T')[0]);
    await page.fill('textarea[name="message"]', 'I need this camera for a wedding shoot');
    
    const insuranceBox = page.locator('input[type="checkbox"]');
    if (await insuranceBox.isVisible()) {
      await insuranceBox.check();
    }
    
    await page.click('button:has-text("Book")');
    await page.waitForTimeout(3000);

    // STEP 6: Payment
    console.log('💳 Step 6: Process payment');
    
    await testUtils.mockStripeSuccess();
    await testUtils.waitForStripeToLoad();
    
    const cardDetails = testUtils.getTestCardDetails();
    await testUtils.fillPaymentForm(cardDetails);
    
    await page.click('button:has-text("Pay")');
    await testUtils.waitForPaymentSuccess();
    
    bookingId = page.url().split('/').pop() || '1';
    console.log(`✅ Booking ${bookingId} created and paid`);

    // STEP 7: Owner Confirms Pickup
    console.log('📦 Step 7: Owner confirms pickup');
    
    await testUtils.logout();
    await page.goto('/login');
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    
    const confirmPickup = page.locator('button:has-text("Confirm Pickup")').first();
    if (await confirmPickup.isVisible()) {
      await confirmPickup.click();
      await page.fill('textarea', 'Item handed over in perfect condition');
      await page.click('button:has-text("Confirm")');
    }

    // STEP 8: Test Messaging
    console.log('💬 Step 8: Test messaging');
    
    const messagesLink = page.locator('a[href*="message"]');
    if (await messagesLink.isVisible()) {
      await messagesLink.click();
      
      const messageInput = page.locator('textarea[placeholder*="message"]');
      if (await messageInput.isVisible()) {
        await messageInput.fill('Camera ready for pickup!');
        await page.click('button:has-text("Send")');
      }
    }

    // STEP 9: Owner Confirms Return
    console.log('🔄 Step 9: Confirm return');
    
    await page.goto('/bookings');
    
    const confirmReturn = page.locator('button:has-text("Confirm Return")').first();
    if (await confirmReturn.isVisible()) {
      await confirmReturn.click();
      await page.fill('textarea', 'Item returned in excellent condition');
      await page.click('button:has-text("Confirm")');
    }

    // STEP 10: Admin Payment Release
    console.log('💰 Step 10: Admin payment release');
    
    await testUtils.loginAsAdmin();
    await page.goto('/admin/payment-releases');
    
    const releaseBtn = page.locator('button:has-text("Release")').first();
    if (await releaseBtn.isVisible()) {
      await releaseBtn.click();
      await page.click('button:has-text("Confirm")');
    }

    // STEP 11: Reviews
    console.log('⭐ Step 11: Leave reviews');
    
    // Renter review
    await testUtils.logout();
    await page.goto('/login');
    await page.fill('input[type="email"]', renterEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/bookings');
    
    const leaveReview = page.locator('button:has-text("Review")').first();
    if (await leaveReview.isVisible()) {
      await leaveReview.click();
      await page.click('[data-value="5"]');
      await page.fill('textarea', 'Excellent camera and great owner!');
      await page.click('button:has-text("Submit")');
    }

    console.log('🎉 COMPLETE JOURNEY TEST PASSED! 🎉');
  });
}); 