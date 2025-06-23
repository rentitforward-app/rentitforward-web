import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';

test.describe('Admin Functionality', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test.describe('Admin Access Control', () => {
    
    test('regular user cannot access admin pages', async ({ page }) => {
      await testUtils.login('regular@test.com');
      await page.goto('/admin');
      
      // Should redirect or show access denied
      const isRedirected = !page.url().includes('/admin');
      const hasAccessDenied = await page.locator('text=Access Denied').isVisible();
      
      expect(isRedirected || hasAccessDenied).toBeTruthy();
    });

    test('admin user can access admin dashboard', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await testUtils.goToAdminDashboard();
      
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('h1')).toContainText(/admin/i);
    });

    test('admin navigation menu is present', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await testUtils.goToAdminDashboard();
      
      // Check for admin navigation items
      await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
      await expect(page.getByRole('link', { name: /bookings/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /listings/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /payment releases/i })).toBeVisible();
    });
  });

  test.describe('Payment Release Management', () => {
    
    test('displays bookings awaiting payment release', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/payment-releases');
      
      await expect(page.locator('h1')).toContainText(/payment releases/i);
      await expect(page.locator('[data-testid="releases-list"]')).toBeVisible();
      
      // Check if there are any pending releases
      const pendingReleases = page.locator('[data-testid="pending-release"]');
      const count = await pendingReleases.count();
      
      if (count > 0) {
        // Verify each pending release shows required information
        await expect(pendingReleases.first().locator('[data-testid="booking-id"]')).toBeVisible();
        await expect(pendingReleases.first().locator('[data-testid="return-date"]')).toBeVisible();
        await expect(pendingReleases.first().locator('[data-testid="working-days"]')).toBeVisible();
        await expect(pendingReleases.first().locator('[data-testid="release-amount"]')).toBeVisible();
      }
    });

    test('can process individual payment release', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/payment-releases');
      
      const releaseButton = page.locator('[data-testid="release-payment"]').first();
      
      if (await releaseButton.isVisible()) {
        await releaseButton.click();
        
        // Should show confirmation dialog
        await expect(page.locator('[data-testid="release-confirmation"]')).toBeVisible();
        await expect(page.locator('[data-testid="release-details"]')).toBeVisible();
        
        // Confirm release
        await page.click('[data-testid="confirm-release"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="release-success"]')).toBeVisible();
        
        // Should remove from pending list
        await expect(releaseButton).not.toBeVisible();
      }
    });

    test('shows working days calculation correctly', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/payment-releases');
      
      const workingDaysElements = page.locator('[data-testid="working-days"]');
      const count = await workingDaysElements.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const workingDaysText = await workingDaysElements.nth(i).textContent();
          expect(workingDaysText).toMatch(/\d+ working days/);
        }
      }
    });

    test('bulk payment release functionality', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/payment-releases');
      
      const bulkReleaseButton = page.locator('[data-testid="bulk-release"]');
      
      if (await bulkReleaseButton.isVisible()) {
        // Select multiple releases
        await page.check('[data-testid="select-release"]');
        
        await bulkReleaseButton.click();
        
        // Should show bulk confirmation
        await expect(page.locator('[data-testid="bulk-confirmation"]')).toBeVisible();
        
        await page.click('[data-testid="confirm-bulk-release"]');
        
        // Should show bulk success message
        await expect(page.locator('[data-testid="bulk-success"]')).toBeVisible();
      }
    });
  });

  test.describe('Booking Management', () => {
    
    test('can view all bookings with filters', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/bookings');
      
      await expect(page.locator('h1')).toContainText(/bookings/i);
      await expect(page.locator('[data-testid="bookings-table"]')).toBeVisible();
      
      // Check filter options
      await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-filter"]')).toBeVisible();
    });

    test('can filter bookings by status', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/bookings');
      
      // Test status filter
      await page.selectOption('[data-testid="status-filter"]', 'paid_awaiting_release');
      await page.click('[data-testid="apply-filters"]');
      
      // Wait for filtered results
      await page.waitForLoadState('networkidle');
      
      // Verify all shown bookings have the selected status
      const statusCells = page.locator('[data-testid="booking-status"]');
      const count = await statusCells.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const statusText = await statusCells.nth(i).textContent();
          expect(statusText).toContain('Paid - Awaiting Release');
        }
      }
    });

    test('can view booking details from admin panel', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/bookings');
      
      const viewButton = page.locator('[data-testid="view-booking"]').first();
      
      if (await viewButton.isVisible()) {
        await viewButton.click();
        
        // Should open booking detail modal or page
        await expect(page.locator('[data-testid="booking-detail"]')).toBeVisible();
        await expect(page.locator('[data-testid="booking-timeline"]')).toBeVisible();
        await expect(page.locator('[data-testid="payment-info"]')).toBeVisible();
      }
    });

    test('can manually update booking status', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/bookings');
      
      const statusChangeButton = page.locator('[data-testid="change-status"]').first();
      
      if (await statusChangeButton.isVisible()) {
        await statusChangeButton.click();
        
        // Should show status change modal
        await expect(page.locator('[data-testid="status-modal"]')).toBeVisible();
        
        await page.selectOption('[data-testid="new-status"]', 'cancelled');
        await page.fill('[data-testid="status-reason"]', 'Test cancellation by admin');
        await page.click('[data-testid="confirm-status-change"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="status-change-success"]')).toBeVisible();
      }
    });
  });

  test.describe('User Management', () => {
    
    test('can view all users', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/users');
      
      await expect(page.locator('h1')).toContainText(/users/i);
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      
      // Check table headers
      await expect(page.locator('th')).toContainText(/name/i);
      await expect(page.locator('th')).toContainText(/email/i);
      await expect(page.locator('th')).toContainText(/role/i);
      await expect(page.locator('th')).toContainText(/status/i);
    });

    test('can search users', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/users');
      
      await page.fill('[data-testid="user-search"]', 'test@example.com');
      await page.press('[data-testid="user-search"]', 'Enter');
      
      await page.waitForLoadState('networkidle');
      
      // Should show filtered results
      const userRows = page.locator('[data-testid="user-row"]');
      const count = await userRows.count();
      
      if (count > 0) {
        const firstUserEmail = await userRows.first().locator('[data-testid="user-email"]').textContent();
        expect(firstUserEmail).toContain('test@example.com');
      }
    });

    test('can view user profile and activity', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/users');
      
      const viewUserButton = page.locator('[data-testid="view-user"]').first();
      
      if (await viewUserButton.isVisible()) {
        await viewUserButton.click();
        
        // Should show user detail modal or page
        await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-bookings"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-listings"]')).toBeVisible();
      }
    });

    test('can manage user roles', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/users');
      
      const roleChangeButton = page.locator('[data-testid="change-role"]').first();
      
      if (await roleChangeButton.isVisible()) {
        await roleChangeButton.click();
        
        // Should show role change modal
        await expect(page.locator('[data-testid="role-modal"]')).toBeVisible();
        
        await page.selectOption('[data-testid="new-role"]', 'moderator');
        await page.click('[data-testid="confirm-role-change"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="role-change-success"]')).toBeVisible();
      }
    });
  });

  test.describe('Reports and Analytics', () => {
    
    test('can view reports dashboard', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/reports');
      
      await expect(page.locator('h1')).toContainText(/reports/i);
      
      // Check for various report widgets
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="booking-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-stats"]')).toBeVisible();
    });

    test('can export reports', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/reports');
      
      const exportButton = page.locator('[data-testid="export-report"]');
      
      if (await exportButton.isVisible()) {
        // Setup download handler
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();
        
        // Should trigger download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/report.*\.(csv|xlsx|pdf)/);
      }
    });

    test('can filter reports by date range', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/reports');
      
      // Set date range
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-12-31');
      await page.click('[data-testid="apply-date-filter"]');
      
      await page.waitForLoadState('networkidle');
      
      // Should update report data
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    });
  });

  test.describe('System Settings', () => {
    
    test('can view and update system settings', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/settings');
      
      await expect(page.locator('h1')).toContainText(/settings/i);
      
      // Check for various setting sections
      await expect(page.locator('[data-testid="platform-settings"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-settings"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
    });

    test('can update platform commission rates', async ({ page }) => {
      await testUtils.loginAsAdmin();
      await page.goto('/admin/settings');
      
      // Update commission rate
      await page.fill('[data-testid="commission-rate"]', '22');
      await page.fill('[data-testid="service-fee-rate"]', '17');
      await page.click('[data-testid="save-rates"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="rates-saved"]')).toBeVisible();
    });
  });
}); 