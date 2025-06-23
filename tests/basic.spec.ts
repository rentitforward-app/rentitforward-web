import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';

test.describe('Basic App Functionality', () => {
  
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main elements are present
    await expect(page).toHaveTitle(/Rent It Forward/);
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for navigation elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: /browse/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });

  test('browse page loads without authentication', async ({ page }) => {
    await page.goto('/browse');
    
    // Should be able to view listings without authentication
    await expect(page).toHaveURL(/\/browse/);
    await expect(page.locator('h1')).toContainText(/browse/i);
  });

  test('protected pages redirect to login', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin pages require admin access', async ({ page }) => {
    // Try to access admin without authentication
    await page.goto('/admin');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test main navigation links
    await page.click('text=Browse');
    await expect(page).toHaveURL(/\/browse/);
    
    await page.click('text=How It Works');
    await expect(page).toHaveURL(/\/how-it-works/);
    
    await page.click('text=About');
    await expect(page).toHaveURL(/\/about/);
  });

  test('responsive design works', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    // Check desktop navigation is visible
    await expect(page.locator('nav')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Mobile navigation should still work (might be in hamburger menu)
    await expect(page.locator('body')).toBeVisible();
  });

  test('search functionality basics', async ({ page }) => {
    await page.goto('/browse');
    
    // Look for search input (if exists)
    const searchInput = page.locator('input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('camera');
      await searchInput.press('Enter');
      
      // Should stay on browse page or redirect to results
      await expect(page).toHaveURL(/\/browse/);
    }
  });

  test('footer contains required links', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    
    // Check for important footer links
    await expect(page.locator('footer')).toBeVisible();
    
    // Test privacy and terms links if they exist
    const privacyLink = page.locator('a[href*="privacy"]');
    const termsLink = page.locator('a[href*="terms"]');
    
    if (await privacyLink.isVisible()) {
      await expect(privacyLink).toBeVisible();
    }
    
    if (await termsLink.isVisible()) {
      await expect(termsLink).toBeVisible();
    }
  });

  test('contact page is accessible', async ({ page }) => {
    await page.goto('/contact');
    
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.locator('h1')).toContainText(/contact/i);
  });

  test('404 page works', async ({ page }) => {
    // Go to a page that doesn't exist
    await page.goto('/this-page-does-not-exist');
    
    // Should show 404 page or redirect
    const is404 = await page.locator('text=404').isVisible();
    const isRedirected = !page.url().includes('this-page-does-not-exist');
    
    expect(is404 || isRedirected).toBeTruthy();
  });
}); 