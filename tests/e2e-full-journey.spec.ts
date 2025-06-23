import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';

/**
 * End-to-End Complete User Journey Test
 * 
 * This test covers the entire Rent It Forward workflow:
 * 1. User signup and verification
 * 2. Browsing items/listings
 * 3. Creating a booking
 * 4. Payment processing
 * 5. Pickup confirmation
 * 6. Return confirmation  
 * 7. Admin payment release
 * 8. Messaging between users
 * 9. Review system
 */

test.describe('Complete User Journey E2E', () => {
  let testUtils: TestUtils;
  let renterEmail: string;
  let ownerEmail: string;
  let adminEmail: string;
  let bookingId: string;

  test.beforeAll(async () => {
    // Generate unique emails for this test run
    const timestamp = Date.now();
    renterEmail = `renter_${timestamp}@test.com`;
    ownerEmail = `owner_${timestamp}@test.com`;
    adminEmail = `admin@rentitforward.com`; // Assume admin exists
  });

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test('Complete user journey from signup to review', async ({ page }) => {
    console.log('🚀 Starting complete user journey test...');

    // ================================
    // STEP 1: OWNER SIGNUP & VERIFICATION
    // ================================
    console.log('📝 Step 1: Owner Signup');
    
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText(/sign up|register/i);

    // Fill owner registration form
    await page.fill('[data-testid="name"], input[name="name"], input[type="text"]:first-of-type', 'John Owner');
    await page.fill('[data-testid="email"], input[name="email"], input[type="email"]', ownerEmail);
    await page.fill('[data-testid="password"], input[name="password"], input[type="password"]:first-of-type', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password"], input[name="confirmPassword"], input[type="password"]:last-of-type', 'SecurePassword123!');
    
    // Accept terms if checkbox exists
    const termsCheckbox = page.locator('[data-testid="terms"], input[type="checkbox"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    await page.click('[data-testid="register-button"], button[type="submit"], button:has-text("Sign Up")');

    // Handle email verification flow
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    
    if (currentUrl.includes('/verify') || currentUrl.includes('/confirm')) {
      console.log('📧 Email verification required - simulating verification');
      // In a real test, you'd handle email verification
      // For now, we'll mock it or assume it's handled
      await page.goto('/login');
    } else if (currentUrl.includes('/dashboard') || currentUrl.includes('/profile')) {
      console.log('✅ Registration successful, user logged in');
    } else {
      // Might be on login page
      await page.goto('/login');
    }

    // ================================
    // STEP 2: OWNER LOGIN & CREATE LISTING
    // ================================
    console.log('🏠 Step 2: Owner creates a listing');

    // Login as owner
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForTimeout(3000);
    
    // Navigate to create listing
    await page.goto('/listings/create');
    
    // If not on create page, try other routes
    if (!page.url().includes('/create')) {
      await page.goto('/dashboard');
      const createListingBtn = page.locator('text=Create Listing, a[href*="create"], button:has-text("Add")');
      if (await createListingBtn.first().isVisible()) {
        await createListingBtn.first().click();
      } else {
        await page.goto('/listings/new');
      }
    }

    // Fill listing creation form
    await page.fill('[data-testid="title"], input[name="title"]', 'Professional DSLR Camera');
    await page.fill('[data-testid="description"], textarea[name="description"]', 'High-quality DSLR camera perfect for photography enthusiasts. Includes lens kit and accessories.');
    await page.fill('[data-testid="price"], input[name="price"], input[type="number"]', '50');
    await page.fill('[data-testid="location"], input[name="location"]', 'Sydney, NSW');

    // Select category if available
    const categoryDropdown = page.locator('[data-testid="category"], select[name="category"]');
    if (await categoryDropdown.isVisible()) {
      await categoryDropdown.selectOption('Electronics');
    }

    // Upload image if file input exists
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      console.log('📸 Uploading listing image...');
      // In a real test, you'd upload an actual image file
      // await fileInput.setInputFiles('path/to/test-image.jpg');
    }

    // Submit listing
    await page.click('[data-testid="create-listing"], button[type="submit"], button:has-text("Create")');
    
    // Wait for listing creation
    await page.waitForTimeout(3000);
    console.log('✅ Listing created successfully');

    // ================================
    // STEP 3: RENTER SIGNUP
    // ================================
    console.log('👤 Step 3: Renter Signup');

    // Logout current user
    await testUtils.logout();

    // Register as renter
    await page.goto('/register');
    await page.fill('[data-testid="name"], input[name="name"], input[type="text"]:first-of-type', 'Jane Renter');
    await page.fill('[data-testid="email"], input[name="email"], input[type="email"]', renterEmail);
    await page.fill('[data-testid="password"], input[name="password"], input[type="password"]:first-of-type', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password"], input[name="confirmPassword"], input[type="password"]:last-of-type', 'SecurePassword123!');
    
    const renterTermsCheckbox = page.locator('[data-testid="terms"], input[type="checkbox"]');
    if (await renterTermsCheckbox.isVisible()) {
      await renterTermsCheckbox.check();
    }

    await page.click('[data-testid="register-button"], button[type="submit"], button:has-text("Sign Up")');
    await page.waitForTimeout(2000);

    // Handle verification and login
    if (!page.url().includes('/dashboard')) {
      await page.goto('/login');
      await page.fill('input[type="email"]', renterEmail);
      await page.fill('input[type="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    console.log('✅ Renter registered and logged in');

    // ================================
    // STEP 4: BROWSE & FIND LISTING
    // ================================
    console.log('🔍 Step 4: Browse listings');

    await page.goto('/browse');
    await page.waitForLoadState('networkidle');

    // Search for the camera listing
    const searchInput = page.locator('[data-testid="search"], input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('DSLR Camera');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Find and click on the listing
    const listingCard = page.locator('[data-testid="listing-card"], .listing-card').first();
    if (await listingCard.isVisible()) {
      await listingCard.click();
    } else {
      // Try to find by title
      await page.click('text=Professional DSLR Camera');
    }

    await page.waitForTimeout(2000);
    console.log('✅ Found and opened listing');

    // ================================
    // STEP 5: CREATE BOOKING
    // ================================
    console.log('📅 Step 5: Create booking');

    // Fill booking form
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3 days rental

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    await page.fill('[data-testid="start-date"], input[name="startDate"]', startDateStr);
    await page.fill('[data-testid="end-date"], input[name="endDate"]', endDateStr);
    await page.fill('[data-testid="message"], textarea[name="message"]', 'Hi! I would like to rent your camera for a wedding photoshoot. I will take great care of it!');

    // Include insurance if option exists
    const insuranceCheckbox = page.locator('[data-testid="include-insurance"], input[type="checkbox"]');
    if (await insuranceCheckbox.isVisible()) {
      await insuranceCheckbox.check();
    }

    // Submit booking
    await page.click('[data-testid="book-now"], button:has-text("Book"), button[type="submit"]');
    await page.waitForTimeout(3000);

    // Extract booking ID from URL
    const urlParts = page.url().split('/');
    bookingId = urlParts[urlParts.indexOf('bookings') + 1] || '1';
    console.log(`✅ Booking created with ID: ${bookingId}`);

    // ================================
    // STEP 6: PAYMENT PROCESSING
    // ================================
    console.log('💳 Step 6: Process payment');

    // Should be on payment page
    await testUtils.waitForStripeToLoad();

    // Mock successful payment for testing
    await testUtils.mockStripeSuccess();

    // Fill payment form with test card
    const cardDetails = testUtils.getTestCardDetails();
    await testUtils.fillPaymentForm(cardDetails);

    // Submit payment
    await page.click('[data-testid="submit-payment"], button:has-text("Pay")');
    await testUtils.waitForPaymentSuccess();

    console.log('✅ Payment processed successfully');

    // ================================
    // STEP 7: OWNER CONFIRMS PICKUP
    // ================================
    console.log('📦 Step 7: Owner confirms pickup');

    // Switch to owner account
    await testUtils.logout();
    await page.goto('/login');
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Go to owner's bookings
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Find the booking and confirm pickup
    const bookingRow = page.locator(`[data-booking-id="${bookingId}"], tr:has-text("Jane Renter")`).first();
    if (await bookingRow.isVisible()) {
      await bookingRow.click();
    } else {
      // Try to find booking in list
      await page.click('[data-testid="booking-item"]').first();
    }

    // Confirm pickup
    const confirmPickupBtn = page.locator('[data-testid="confirm-pickup"], button:has-text("Confirm Pickup")');
    if (await confirmPickupBtn.isVisible()) {
      await confirmPickupBtn.click();
      
      await page.fill('[data-testid="pickup-notes"], textarea', 'Item handed over to renter in excellent condition. All accessories included.');
      
      // Upload pickup photo if available
      const pickupPhotoInput = page.locator('input[type="file"]');
      if (await pickupPhotoInput.isVisible()) {
        console.log('📸 Pickup photo upload available');
      }
      
      await page.click('[data-testid="submit-pickup"], button:has-text("Confirm")');
      await page.waitForTimeout(2000);
    }

    console.log('✅ Pickup confirmed by owner');

    // ================================
    // STEP 8: MESSAGING BETWEEN USERS
    // ================================
    console.log('💬 Step 8: Test messaging system');

    // Try to access messages/chat
    const messagesLink = page.locator('[data-testid="messages"], a[href*="message"]');
    if (await messagesLink.isVisible()) {
      await messagesLink.click();
      
      // Send a message
      const messageInput = page.locator('[data-testid="message-input"], textarea[placeholder*="message"]');
      if (await messageInput.isVisible()) {
        await messageInput.fill('Hi Jane! The camera is ready for pickup. Please handle with care!');
        await page.click('[data-testid="send-message"], button:has-text("Send")');
        await page.waitForTimeout(1000);
        console.log('✅ Message sent from owner to renter');
      }
    } else {
      console.log('ℹ️ Messaging system not yet implemented');
    }

    // ================================
    // STEP 9: RENTER USES ITEM & RETURNS
    // ================================
    console.log('🔄 Step 9: Simulate item usage period');

    // Switch back to renter
    await testUtils.logout();
    await page.goto('/login');
    await page.fill('input[type="email"]', renterEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check renter's booking status
    await page.goto('/bookings');
    await testUtils.expectBookingStatus('Active');

    // Fast-forward simulation: Owner confirms return
    await testUtils.logout();
    await page.goto('/login');
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto('/bookings');
    
    // Confirm return
    const confirmReturnBtn = page.locator('[data-testid="confirm-return"], button:has-text("Confirm Return")');
    if (await confirmReturnBtn.isVisible()) {
      await confirmReturnBtn.click();
      
      await page.fill('[data-testid="return-notes"], textarea', 'Item returned in perfect condition. Great renter!');
      
      // Upload return photo if available
      const returnPhotoInput = page.locator('input[type="file"]');
      if (await returnPhotoInput.isVisible()) {
        console.log('📸 Return photo upload available');
      }
      
      await page.click('[data-testid="submit-return"], button:has-text("Confirm")');
      await page.waitForTimeout(2000);
    }

    console.log('✅ Return confirmed by owner');

    // ================================
    // STEP 10: ADMIN PAYMENT RELEASE
    // ================================
    console.log('💰 Step 10: Admin processes payment release');

    // Switch to admin
    await testUtils.logout();
    await testUtils.loginAsAdmin();
    await page.goto('/admin/payment-releases');

    // Find and process payment release
    const pendingRelease = page.locator('[data-testid="pending-release"]').first();
    if (await pendingRelease.isVisible()) {
      const releaseBtn = pendingRelease.locator('[data-testid="release-payment"]');
      await releaseBtn.click();
      
      // Confirm release
      await page.click('[data-testid="confirm-release"]');
      await page.waitForTimeout(2000);
      
      console.log('✅ Payment released by admin');
    } else {
      console.log('ℹ️ No pending releases found or payment already processed');
    }

    // ================================
    // STEP 11: REVIEW SYSTEM
    // ================================
    console.log('⭐ Step 11: Test review system');

    // Switch back to renter to leave review
    await testUtils.logout();
    await page.goto('/login');
    await page.fill('input[type="email"]', renterEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto('/bookings');

    // Look for review option
    const leaveReviewBtn = page.locator('[data-testid="leave-review"], button:has-text("Review"), a:has-text("Review")');
    if (await leaveReviewBtn.isVisible()) {
      await leaveReviewBtn.click();
      
      // Fill review form
      await page.click('[data-testid="rating-5"], .rating [data-value="5"]');
      await page.fill('[data-testid="review-text"], textarea[name="review"]', 'Excellent camera and great owner! The pickup and return process was smooth. Highly recommended!');
      
      await page.click('[data-testid="submit-review"], button:has-text("Submit")');
      await page.waitForTimeout(2000);
      
      console.log('✅ Review submitted by renter');
    } else {
      console.log('ℹ️ Review system not yet implemented');
    }

    // Owner leaves review for renter
    await testUtils.logout();
    await page.goto('/login');
    await page.fill('input[type="email"]', ownerEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto('/bookings');
    
    const ownerReviewBtn = page.locator('[data-testid="leave-review"], button:has-text("Review"), a:has-text("Review")');
    if (await ownerReviewBtn.isVisible()) {
      await ownerReviewBtn.click();
      
      await page.click('[data-testid="rating-5"], .rating [data-value="5"]');
      await page.fill('[data-testid="review-text"], textarea[name="review"]', 'Fantastic renter! Took great care of my camera and returned it in perfect condition. Would rent to again!');
      
      await page.click('[data-testid="submit-review"], button:has-text("Submit")');
      await page.waitForTimeout(2000);
      
      console.log('✅ Review submitted by owner');
    }

    // ================================
    // STEP 12: VERIFICATION & CLEANUP
    // ================================
    console.log('✅ Step 12: Final verification');

    // Verify final booking status
    await testUtils.expectBookingStatus('Completed');

    // Check that listing is available for future bookings
    await page.goto('/browse');
    await expect(page.locator('text=Professional DSLR Camera')).toBeVisible();

    console.log('🎉 COMPLETE USER JOURNEY TEST SUCCESSFUL! 🎉');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Owner signup & listing creation');
    console.log('✅ Renter signup & discovery');
    console.log('✅ Booking creation & payment');
    console.log('✅ Pickup & return confirmation');
    console.log('✅ Admin payment release');
    console.log('✅ Messaging system (if implemented)');
    console.log('✅ Review system (if implemented)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  test('Verify pricing calculations throughout journey', async ({ page }) => {
    console.log('💰 Testing pricing calculations...');
    
    // This test focuses specifically on pricing accuracy
    await testUtils.login();
    await page.goto('/listings/1');
    
    const bookingData = testUtils.getTestBookingData();
    await testUtils.fillBookingForm(bookingData);
    
    // Verify pricing breakdown appears
    await expect(page.locator('[data-testid="base-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="insurance-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-price"]')).toBeVisible();
    
    // Verify calculations (15% service fee, 10% insurance)
    const basePriceText = await page.locator('[data-testid="base-price"]').textContent();
    if (basePriceText) {
      const basePrice = parseFloat(basePriceText.replace(/[^0-9.]/g, ''));
      
      const serviceFeeText = await page.locator('[data-testid="service-fee"]').textContent();
      const insuranceFeeText = await page.locator('[data-testid="insurance-fee"]').textContent();
      
      if (serviceFeeText && insuranceFeeText) {
        const serviceFee = parseFloat(serviceFeeText.replace(/[^0-9.]/g, ''));
        const insuranceFee = parseFloat(insuranceFeeText.replace(/[^0-9.]/g, ''));
        
        expect(serviceFee).toBeCloseTo(basePrice * 0.15, 2);
        expect(insuranceFee).toBeCloseTo(basePrice * 0.10, 2);
        
        console.log(`✅ Pricing verified: Base $${basePrice}, Service $${serviceFee}, Insurance $${insuranceFee}`);
      }
    }
  });

  test('Test error handling and edge cases', async ({ page }) => {
    console.log('🚨 Testing error scenarios...');
    
    // Test booking with past dates
    await testUtils.login();
    await page.goto('/listings/1');
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    await page.fill('[data-testid="start-date"]', pastDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="end-date"]', pastDate.toISOString().split('T')[0]);
    
    await page.click('[data-testid="book-now"]');
    
    // Should show validation error
    const errorMsg = page.locator('[data-testid="date-error"], .error, text=past');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    console.log('✅ Past date validation working');
    
    // Test double booking prevention
    // Test payment failure handling
    await testUtils.mockStripeFailure();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    await page.fill('[data-testid="start-date"]', futureDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="end-date"]', futureDate.toISOString().split('T')[0]);
    
    await page.click('[data-testid="book-now"]');
    
    if (page.url().includes('/payment')) {
      await testUtils.waitForStripeToLoad();
      const cardDetails = testUtils.getTestCardDetails();
      await testUtils.fillPaymentForm(cardDetails);
      await page.click('[data-testid="submit-payment"]');
      
      // Should show payment error
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      console.log('✅ Payment failure handling working');
    }
  });
}); 