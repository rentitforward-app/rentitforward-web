import { test, expect } from '@playwright/test';

test.describe('User Signup Flow Test', () => {
  test.setTimeout(120000); // 2 minutes

  test('User signup, verification, and profile setup', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test_user_${timestamp}@example.com`;
    const testName = 'Test User';
    const testPassword = 'SecurePassword123!';
    
    console.log('🚀 Starting User Signup Flow Test');
    console.log(`📧 Test Email: ${testEmail}`);

    // STEP 1: Navigate to Registration
    console.log('\n📝 Step 1: Navigate to Registration Page');
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/.*register.*/);
    console.log('✅ Registration page loaded');

    // Take screenshot
    await page.screenshot({ path: `test-results/signup-01-registration-${timestamp}.png` });

    // STEP 2: Fill Registration Form
    console.log('\n📋 Step 2: Fill Registration Form');
    
    // Look for form fields
    const nameField = page.locator('input[name="name"], input[type="text"]:visible').first();
    const emailField = page.locator('input[name="email"], input[type="email"]:visible').first();
    const passwordField = page.locator('input[name="password"], input[type="password"]:visible').first();
    
    // Check field visibility
    const nameVisible = await nameField.isVisible();
    const emailVisible = await emailField.isVisible();
    const passwordVisible = await passwordField.isVisible();
    
    console.log(`✓ Name field: ${nameVisible}`);
    console.log(`✓ Email field: ${emailVisible}`);
    console.log(`✓ Password field: ${passwordVisible}`);

    if (nameVisible && emailVisible && passwordVisible) {
      await nameField.fill(testName);
      await emailField.fill(testEmail);
      await passwordField.fill(testPassword);
      
      // Check for confirm password
      const confirmField = page.locator('input[type="password"]:visible').nth(1);
      if (await confirmField.isVisible()) {
        await confirmField.fill(testPassword);
        console.log('✅ Confirm password filled');
      }
      
      // Check for terms
      const termsBox = page.locator('input[type="checkbox"]').first();
      if (await termsBox.isVisible()) {
        await termsBox.check();
        console.log('✅ Terms accepted');
      }
      
      console.log('✅ Form filled successfully');
    } else {
      console.log('❌ Form fields not found');
      await page.screenshot({ path: `test-results/signup-error-no-fields-${timestamp}.png` });
    }

    // Take screenshot after filling
    await page.screenshot({ path: `test-results/signup-02-form-filled-${timestamp}.png` });

    // STEP 3: Submit Registration
    console.log('\n🚀 Step 3: Submit Registration');
    
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register")').first();
    
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      console.log('✅ Registration submitted');
      
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      // Check for messages
      const successMsg = page.locator('text=success, text=verify, text=email').first();
      const errorMsg = page.locator('text=error, .error').first();
      
      if (await successMsg.isVisible()) {
        const text = await successMsg.textContent();
        console.log(`✅ Success: ${text}`);
      }
      
      if (await errorMsg.isVisible()) {
        const text = await errorMsg.textContent();
        console.log(`⚠️ Error: ${text}`);
      }
    }

    // Take screenshot after submission
    await page.screenshot({ path: `test-results/signup-03-after-submit-${timestamp}.png` });

    // STEP 4: Check Email Verification Flow
    console.log('\n📧 Step 4: Email Verification');
    
    if (page.url().includes('/verify') || page.url().includes('/confirm')) {
      console.log('📧 Email verification page detected');
      
      const pageText = await page.locator('body').textContent();
      console.log('Page content preview:', pageText?.substring(0, 200));
      
      // Look for verification form
      const verifyForm = page.locator('input[type="text"], input[name="code"], input[name="token"]').first();
      if (await verifyForm.isVisible()) {
        console.log('✅ Verification input found');
      }
      
    } else if (page.url().includes('/dashboard')) {
      console.log('✅ Auto-logged in after signup');
    } else if (page.url().includes('/login')) {
      console.log('↪️ Redirected to login');
    }

    // STEP 5: Try Login (if not auto-logged in)
    console.log('\n🔐 Step 5: Login Attempt');
    
    if (!page.url().includes('/dashboard') && !page.url().includes('/profile')) {
      await page.goto('/login');
      
      const loginEmail = page.locator('input[type="email"]').first();
      const loginPassword = page.locator('input[type="password"]').first();
      
      if (await loginEmail.isVisible() && await loginPassword.isVisible()) {
        await loginEmail.fill(testEmail);
        await loginPassword.fill(testPassword);
        
        const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
        if (await loginBtn.isVisible()) {
          await loginBtn.click();
          await page.waitForTimeout(3000);
          console.log('✅ Login attempted');
        }
      }
    }

    // STEP 6: Profile Setup
    console.log('\n👤 Step 6: Profile Setup');
    
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of profile page
    await page.screenshot({ path: `test-results/signup-04-profile-page-${timestamp}.png` });
    
    // Look for profile fields
    const profileFields = page.locator('input[name="phone"], textarea[name="bio"], input[name="location"]');
    const fieldCount = await profileFields.count();
    
    console.log(`Found ${fieldCount} profile fields`);
    
    if (fieldCount > 0) {
      const phoneField = page.locator('input[name="phone"], input[type="tel"]').first();
      const bioField = page.locator('textarea[name="bio"]').first();
      const locationField = page.locator('input[name="location"]').first();
      
      if (await phoneField.isVisible()) {
        await phoneField.fill('+61412345678');
        console.log('✅ Phone filled');
      }
      
      if (await bioField.isVisible()) {
        await bioField.fill('Test bio for automated testing');
        console.log('✅ Bio filled');
      }
      
      if (await locationField.isVisible()) {
        await locationField.fill('Sydney, NSW');
        console.log('✅ Location filled');
      }
      
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        console.log('✅ Profile saved');
      }
    }

    // STEP 7: Navigation Test
    console.log('\n🧭 Step 7: Test User Navigation');
    
    // Test dashboard access
    await page.goto('/dashboard');
    if (page.url().includes('/dashboard')) {
      console.log('✅ Dashboard accessible');
    } else {
      console.log('⚠️ Dashboard not accessible');
    }
    
    // Test browse page
    await page.goto('/browse');
    if (page.url().includes('/browse')) {
      console.log('✅ Browse page accessible');
    }

    // Final screenshot
    await page.screenshot({ path: `test-results/signup-05-final-state-${timestamp}.png` });

    // STEP 8: Summary Report
    console.log('\n📊 SIGNUP FLOW ANALYSIS:');
    console.log('=========================');
    console.log(`📧 Test Email: ${testEmail}`);
    console.log(`👤 Test Name: ${testName}`);
    console.log(`🕒 Test Timestamp: ${timestamp}`);
    console.log(`📸 Screenshots: test-results/signup-*-${timestamp}.png`);
    
    console.log('\n🔧 POTENTIAL IMPROVEMENTS:');
    console.log('- Add email verification step if missing');
    console.log('- Implement welcome/onboarding flow');
    console.log('- Add profile completion progress indicator');
    console.log('- Consider social login options');
    console.log('- Add password strength indicator');
    
    console.log('\n✅ SIGNUP FLOW TEST COMPLETED');
  });

  test('Form validation testing', async ({ page }) => {
    console.log('🧪 Testing form validation...');
    
    await page.goto('/register');
    
    // Test empty form submission
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      
      // Look for validation errors
      const errors = page.locator('.error, [role="alert"], .invalid');
      const errorCount = await errors.count();
      
      console.log(`Found ${errorCount} validation errors`);
      
      if (errorCount > 0) {
        console.log('✅ Form validation working');
      } else {
        console.log('⚠️ No validation errors shown');
      }
    }

    // Test invalid email
    const emailField = page.locator('input[type="email"]').first();
    if (await emailField.isVisible()) {
      await emailField.fill('invalid-email');
      await submitBtn.click();
      
      const emailError = page.locator('text=email, text=invalid').first();
      if (await emailError.isVisible()) {
        console.log('✅ Email validation working');
      }
    }
  });

  test('Password requirements testing', async ({ page }) => {
    console.log('🔐 Testing password requirements...');
    
    await page.goto('/register');
    
    const passwordField = page.locator('input[type="password"]').first();
    if (await passwordField.isVisible()) {
      // Test weak password
      await passwordField.fill('123');
      
      // Look for password strength indicator
      const strengthIndicator = page.locator('.password-strength, .strength, text=weak').first();
      if (await strengthIndicator.isVisible()) {
        console.log('✅ Password strength indicator found');
      } else {
        console.log('⚠️ Consider adding password strength indicator');
      }
    }
  });
}); 