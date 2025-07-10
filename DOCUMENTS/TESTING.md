# Testing Guide - Rent It Forward

This document covers the testing setup and guidelines for the Rent It Forward web application using Playwright.

## Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Playwright browsers (installed automatically)

### Installation
Playwright is already configured in this project. To get started:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Set up environment variables (copy from `.env.local.template` if needed):
   ```bash
   cp .env.local.template .env.local
   ```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with browser UI visible
npm run test:headed

# Run tests with Playwright UI mode (interactive)
npm run test:ui

# Debug tests step by step
npm run test:debug

# View test reports
npm run test:report
```

### Specific Test Suites

```bash
# Run only basic functionality tests
npx playwright test basic.spec.ts

# Run only booking flow tests
npx playwright test booking-flow.spec.ts

# Run only admin tests
npx playwright test admin.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Development Mode

```bash
# Run tests against local development server
npm run dev  # In one terminal
npm test     # In another terminal
```

## Test Structure

### Test Files
- `tests/basic.spec.ts` - Basic app functionality, navigation, responsive design
- `tests/booking-flow.spec.ts` - Complete booking workflow from browse to payment
- `tests/admin.spec.ts` - Admin panel functionality (to be created)
- `tests/test-utils.ts` - Shared utilities and helper functions

### Test Organization

Tests are organized by feature/functionality:

1. **Basic App Functionality**
   - Homepage loading
   - Navigation
   - Authentication redirects
   - Responsive design

2. **Booking Flow**
   - Listing browsing
   - Booking creation
   - Payment processing
   - Booking management

3. **Admin Functionality**
   - Payment releases
   - Booking management
   - User administration
   - Reports and analytics

## Test Data

### Mock Data
Tests use mock data and Stripe test cards:
- Card Number: `4242424242424242`
- Expiry: `12/25`
- CVC: `123`

### Test Users
The following test users should be available in your test database:
- Regular user: `test@example.com` / `testpassword123`
- Admin user: `admin@rentitforward.com` / `adminpassword123`
- Owner user: `owner@test.com` / `ownerpassword123`

## Continuous Integration

Tests run automatically on:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches

### GitHub Actions Workflow
See `.github/workflows/playwright.yml` for the CI configuration.

Required secrets in GitHub:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Writing Tests

### Best Practices

1. **Use test-specific data attributes**:
   ```html
   <button data-testid="submit-booking">Book Now</button>
   ```

2. **Use the TestUtils class**:
   ```typescript
   const testUtils = new TestUtils(page);
   await testUtils.login();
   await testUtils.fillBookingForm(data);
   ```

3. **Mock external services**:
   ```typescript
   await testUtils.mockStripeSuccess();
   ```

4. **Wait for elements and states**:
   ```typescript
   await page.waitForLoadState('networkidle');
   await testUtils.waitForStripeToLoad();
   ```

### Test Structure Example

```typescript
import { test, expect } from '@playwright/test';
import { TestUtils } from './test-utils';

test.describe('Feature Name', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test('specific functionality works', async ({ page }) => {
    // Arrange
    await testUtils.login();
    
    // Act
    await page.click('[data-testid="action-button"]');
    
    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

## Debugging Tests

### Visual Debugging
1. Use `--headed` flag to see browser actions
2. Use `--debug` flag to step through tests
3. Use `page.pause()` to pause execution

### Screenshots and Videos
- Screenshots are taken on failure automatically
- Videos are recorded on failure
- Traces are collected on retry

### Common Issues

1. **Test timeouts**: Increase timeout in `playwright.config.ts`
2. **Element not found**: Check data-testid attributes exist
3. **Flaky tests**: Add proper waits and assertions

## Test Environment

### Database
Tests should use a separate test database to avoid conflicts with development data.

### Stripe
Tests use Stripe test mode with test cards and webhooks.

### Authentication
Tests use test user accounts that should be seeded in the test database.

## Coverage and Reports

Test reports are generated in HTML format and include:
- Test results summary
- Screenshots and videos for failures
- Execution traces
- Performance metrics

Access reports with:
```bash
npm run test:report
```

## Adding New Tests

When adding new features:

1. Add appropriate `data-testid` attributes to UI elements
2. Create or update test files in the `tests/` directory
3. Use the `TestUtils` class for common operations
4. Follow the existing test structure and naming conventions
5. Ensure tests are deterministic and don't rely on external state

## Performance Testing

Playwright can also be used for basic performance testing:
- Page load times
- Navigation performance
- Memory usage
- Network requests

Consider adding performance assertions for critical user flows. 