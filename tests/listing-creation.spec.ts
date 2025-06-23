import { test, expect } from '@playwright/test';

test.describe('Listing Creation Flow', () => {
  test('should create listing that requires admin approval', async ({ page }) => {
    // Navigate to create listing page (should redirect to login first)
    await page.goto('/listings/create');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login.*/);
    
    // Fill login form (you'll need a test user)
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should be redirected back to create listing page
    await expect(page).toHaveURL(/.*create.*/);
    
    // Fill out the listing form step by step
    
    // Step 1: Basic Details
    await page.fill('[name="title"]', 'Test Power Drill for Rent');
    await page.fill('[name="description"]', 'Professional grade power drill perfect for home improvement projects. Includes various drill bits and accessories.');
    
    // Select category
    await page.click('[value="tools-diy"]');
    
    // Go to next step
    await page.click('button:has-text("Next")');
    
    // Step 2: Item Condition
    await page.click('[value="like-new"]');
    await page.fill('[name="brand"]', 'DeWalt');
    await page.fill('[name="model"]', 'DCD771C2');
    await page.fill('[name="year"]', '2023');
    
    await page.click('button:has-text("Next")');
    
    // Step 3: Pricing
    await page.fill('[name="dailyRate"]', '25');
    await page.fill('[name="weeklyRate"]', '150');
    await page.fill('[name="depositAmount"]', '50');
    
    await page.click('button:has-text("Next")');
    
    // Step 4: Location & Delivery
    await page.fill('[name="location"]', 'Sydney');
    await page.selectOption('[name="state"]', 'NSW');
    await page.fill('[name="postcode"]', '2000');
    
    // Select delivery methods
    await page.check('[value="pickup"]');
    await page.check('[value="delivery"]');
    
    await page.click('button:has-text("Next")');
    
    // Step 5: Photos (skip for test)
    // Add a dummy image file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    // You'd need to provide a test image file here
    
    // Submit the form
    await page.click('button:has-text("Create Listing")');
    
    // Should show success message about admin approval
    await expect(page.locator('text=awaiting admin approval')).toBeVisible();
    
    // Should redirect to listing page
    await expect(page).toHaveURL(/.*listings\/.*/);
  });
  
  test('admin should be able to approve pending listings', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to admin listings page
    await page.goto('/admin/listings');
    
    // Should see pending listings tab
    await expect(page.locator('text=Pending Listings')).toBeVisible();
    
    // Should see at least one pending listing
    await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();
    
    // Click approve button
    await page.click('button:has-text("Approve")');
    
    // Should show success message
    await expect(page.locator('text=approved successfully')).toBeVisible();
    
    // Switch to approved tab
    await page.click('button:has-text("Approved Listings")');
    
    // Should see the approved listing
    await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();
  });
}); 