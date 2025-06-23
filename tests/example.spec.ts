import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';

/**
 * Example test file demonstrating best practices for testing new features
 * 
 * This file shows:
 * - How to structure tests
 * - How to use TestUtils
 * - How to mock external services
 * - How to handle different user roles
 * - How to test error scenarios
 */

test.describe('Example Feature Tests', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test.describe('Authentication Required Features', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login before each test in this group
      await testUtils.login();
    });

    test('user can access protected feature', async ({ page }) => {
      // Navigate to the feature
      await page.goto('/protected-feature');
      
      // Verify access is granted
      await expect(page.locator('h1')).toContainText('Protected Feature');
      await expect(page.locator('[data-testid="feature-content"]')).toBeVisible();
    });

    test('user can perform main action', async ({ page }) => {
      await page.goto('/protected-feature');
      
      // Fill form
      await page.fill('[data-testid="input-field"]', 'Test input');
      await page.selectOption('[data-testid="dropdown"]', 'option1');
      await page.check('[data-testid="checkbox"]');
      
      // Submit form
      await page.click('[data-testid="submit-button"]');
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await testUtils.expectElementToContainText('[data-testid="success-message"]', 'Success');
    });

    test('form validation works correctly', async ({ page }) => {
      await page.goto('/protected-feature');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-button"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-error"]')).toContainText('This field is required');
    });

    test('user can cancel action', async ({ page }) => {
      await page.goto('/protected-feature');
      
      // Start filling form
      await page.fill('[data-testid="input-field"]', 'Test input');
      
      // Cancel
      await page.click('[data-testid="cancel-button"]');
      
      // Verify form is reset or user is redirected
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/protected-feature');
    });
  });

  test.describe('Public Features', () => {
    
    test('anonymous user can view public content', async ({ page }) => {
      await page.goto('/public-feature');
      
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="public-content"]')).toBeVisible();
    });

    test('anonymous user is prompted to login for protected actions', async ({ page }) => {
      await page.goto('/public-feature');
      
      // Try to perform protected action
      await page.click('[data-testid="protected-action"]');
      
      // Should redirect to login
      await testUtils.expectToBeOnPage('/login');
    });
  });

  test.describe('Admin Only Features', () => {
    
    test('admin can access admin features', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/feature');
      
      await expect(page.locator('h1')).toContainText('Admin Feature');
      await expect(page.locator('[data-testid="admin-controls"]')).toBeVisible();
    });

    test('regular user cannot access admin features', async ({ page }) => {
      await testUtils.login(); // Regular user
      await page.goto('/admin/feature');
      
      // Should be redirected or show access denied
      const isRedirected = !page.url().includes('/admin/feature');
      const hasAccessDenied = await page.locator('text=Access Denied').isVisible();
      
      expect(isRedirected || hasAccessDenied).toBeTruthy();
    });
  });

  test.describe('API Integration', () => {
    
    test('handles successful API responses', async ({ page }) => {
      // Mock successful API response
      await page.route('**/api/feature/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            data: { id: 1, name: 'Test Item' }
          })
        });
      });

      await testUtils.login();
      await page.goto('/feature');
      
      await page.click('[data-testid="load-data"]');
      
      // Verify data is displayed
      await expect(page.locator('[data-testid="data-item"]')).toContainText('Test Item');
    });

    test('handles API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/feature/**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Internal server error'
          })
        });
      });

      await testUtils.login();
      await page.goto('/feature');
      
      await page.click('[data-testid="load-data"]');
      
      // Verify error is shown
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('error');
    });

    test('handles network failures', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/feature/**', route => route.abort());

      await testUtils.login();
      await page.goto('/feature');
      
      await page.click('[data-testid="load-data"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    
    test('feature works on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await testUtils.login();
      await page.goto('/feature');
      
      // Verify mobile-specific elements
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-content"]')).toBeVisible();
    });

    test('feature works on tablets', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await testUtils.login();
      await page.goto('/feature');
      
      await expect(page.locator('[data-testid="feature-content"]')).toBeVisible();
    });

    test('feature works on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await testUtils.login();
      await page.goto('/feature');
      
      await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-content"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    
    test('page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/feature');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
    });

    test('feature does not have memory leaks', async ({ page }) => {
      await testUtils.login();
      await page.goto('/feature');
      
      // Perform actions that might cause memory leaks
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="action-button"]');
        await page.waitForTimeout(100);
      }
      
      // Check that page is still responsive
      await expect(page.locator('[data-testid="feature-content"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    
    test('feature is keyboard navigable', async ({ page }) => {
      await testUtils.login();
      await page.goto('/feature');
      
      // Navigate using keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Verify keyboard navigation works
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('feature has proper ARIA labels', async ({ page }) => {
      await testUtils.login();
      await page.goto('/feature');
      
      // Check for ARIA labels
      await expect(page.locator('[aria-label]')).toBeVisible();
      await expect(page.locator('[role="button"]')).toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    
    test('user input is preserved on page refresh', async ({ page }) => {
      await testUtils.login();
      await page.goto('/feature');
      
      // Enter some data
      await page.fill('[data-testid="input-field"]', 'Test data');
      
      // Refresh page
      await page.reload();
      
      // Verify data is still there (if feature supports persistence)
      const inputValue = await page.locator('[data-testid="input-field"]').inputValue();
      expect(inputValue).toBe('Test data');
    });
  });
});

// Example of testing with specific browser features
test.describe('Browser-specific Features', () => {
  
  test('feature works with local storage', async ({ page }) => {
    await page.goto('/feature');
    
    // Set local storage item
    await page.evaluate(() => {
      localStorage.setItem('testKey', 'testValue');
    });
    
    await page.reload();
    
    // Verify local storage is used
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('testKey');
    });
    
    expect(storedValue).toBe('testValue');
  });

  test('feature handles offline scenarios', async ({ page, context }) => {
    await testUtils.login();
    await page.goto('/feature');
    
    // Simulate offline
    await context.setOffline(true);
    
    await page.click('[data-testid="action-button"]');
    
    // Verify offline handling
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
  });
}); 