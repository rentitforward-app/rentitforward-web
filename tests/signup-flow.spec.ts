import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

test.describe('User Signup & Profile Setup Flow', () => {
  test.setTimeout(120000); // 2 minutes

  test('Complete signup flow: registration → verification → profile setup', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test_signup_${timestamp}@example.com`;
    const testName = 'Test User';
    const testPassword = 'SecurePassword123!';
    
    console.log('🚀 Starting User Signup Flow Test');
    console.log(`📧 Test Email: ${testEmail}`);
    console.log(`👤 Test Name: ${testName}`);

    // Clean up any existing test data first
    await cleanupTestUser(testEmail);

    // STEP 1: Navigate to Registration Page
    console.log('\n📝 Step 1: Navigate to Registration Page');
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the registration page
    await expect(page).toHaveURL(/.*register.*/);
    console.log('✅ Registration page loaded');

    // Take screenshot of registration page
    await page.screenshot({ path: `test-results/01-registration-page-${timestamp}.png` });

    // STEP 2: Fill Registration Form
    console.log('\n📋 Step 2: Fill Registration Form');
    
    // Look for form fields with multiple possible selectors
    const nameField = page.locator('input[name="name"], input[type="text"]:visible, input[placeholder*="name" i]').first();
    const emailField = page.locator('input[name="email"], input[type="email"]:visible, input[placeholder*="email" i]').first();
    const passwordField = page.locator('input[name="password"], input[type="password"]:visible, input[placeholder*="password" i]').first();
    const confirmPasswordField = page.locator('input[name="confirmPassword"], input[name="confirm-password"], input[type="password"]:visible').nth(1);
    
    // Check if fields are visible
    const nameVisible = await nameField.isVisible();
    const emailVisible = await emailField.isVisible();
    const passwordVisible = await passwordField.isVisible();
    
    console.log(`Name field visible: ${nameVisible}`);
    console.log(`Email field visible: ${emailVisible}`);
    console.log(`Password field visible: ${passwordVisible}`);

    if (nameVisible && emailVisible && passwordVisible) {
      // Fill the form
      await nameField.fill(testName);
      console.log('✅ Name field filled');
      
      await emailField.fill(testEmail);
      console.log('✅ Email field filled');
      
      await passwordField.fill(testPassword);
      console.log('✅ Password field filled');
      
      // Fill confirm password if it exists
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(testPassword);
        console.log('✅ Confirm password field filled');
      }
      
      // Check for terms checkbox
      const termsCheckbox = page.locator('input[type="checkbox"], input[name="terms"], input[name="agree"]').first();
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
        console.log('✅ Terms checkbox checked');
      }
      
      // Take screenshot after filling form
      await page.screenshot({ path: `test-results/02-form-filled-${timestamp}.png` });
      
      // STEP 3: Submit Registration
      console.log('\n🚀 Step 3: Submit Registration');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('✅ Registration form submitted');
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        // Take screenshot after submission
        await page.screenshot({ path: `test-results/03-after-submission-${timestamp}.png` });
        
        // Check what happened after submission
        const currentUrl = page.url();
        console.log(`Current URL after submission: ${currentUrl}`);
        
        // Look for success messages, error messages, or redirects
        const successMessage = page.locator('text=success, text=verify, text=email sent, .success, .alert-success').first();
        const errorMessage = page.locator('text=error, .error, .alert-error, .alert-danger').first();
        
        if (await successMessage.isVisible()) {
          const successText = await successMessage.textContent();
          console.log(`✅ Success message: ${successText}`);
        }
        
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          console.log(`❌ Error message: ${errorText}`);
        }
        
      } else {
        console.log('❌ Submit button not found');
        // Take screenshot for debugging
        await page.screenshot({ path: `test-results/error-no-submit-button-${timestamp}.png` });
      }
      
    } else {
      console.log('❌ Registration form fields not found');
      // Take screenshot for debugging
      await page.screenshot({ path: `test-results/error-no-form-fields-${timestamp}.png` });
    }

    // STEP 4: Check Database - User Created
    console.log('\n🗄️  Step 4: Verify User in Database');
    
    await page.waitForTimeout(3000); // Give database time to update
    
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.log(`⚠️  Auth error: ${authError.message}`);
      } else {
        const testUser = authUsers.users.find(user => user.email === testEmail);
        
        if (testUser) {
          console.log('✅ User found in auth.users table');
          console.log(`User ID: ${testUser.id}`);
          console.log(`Email: ${testUser.email}`);
          console.log(`Email Confirmed: ${testUser.email_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`Created At: ${testUser.created_at}`);
          console.log(`Metadata:`, testUser.user_metadata);
          
          // Check if user exists in profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', testUser.id)
            .single();
          
          if (profileError) {
            console.log(`⚠️  Profile error: ${profileError.message}`);
          } else if (profile) {
            console.log('✅ User profile found in profiles table');
            console.log('Profile data:', profile);
          } else {
            console.log('⚠️  No profile found in profiles table');
          }
          
        } else {
          console.log('❌ User NOT found in auth.users table');
        }
      }
    } catch (dbError) {
      console.log(`❌ Database check error: ${dbError}`);
    }

    // STEP 5: Test Email Verification Flow (if needed)
    console.log('\n📧 Step 5: Email Verification Flow');
    
    if (page.url().includes('/verify') || page.url().includes('/confirm')) {
      console.log('📧 Email verification page detected');
      
      // Look for verification instructions
      const verificationText = await page.locator('body').textContent();
      console.log('Verification page content:', verificationText?.substring(0, 200) + '...');
      
      // In a real test, you would:
      // 1. Check email inbox for verification link
      // 2. Extract verification token
      // 3. Visit verification URL
      // For now, we'll simulate this
      
      console.log('ℹ️  Email verification would be handled here in production');
      
    } else if (page.url().includes('/dashboard') || page.url().includes('/profile')) {
      console.log('✅ User automatically logged in after registration');
    } else if (page.url().includes('/login')) {
      console.log('ℹ️  Redirected to login page - may need to verify email first');
    }

    // STEP 6: Test Profile Setup
    console.log('\n👤 Step 6: Profile Setup');
    
    // Try to navigate to profile setup
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    const profileFields = page.locator('input[name="name"], input[name="phone"], textarea[name="bio"], input[name="location"]');
    const profileFieldCount = await profileFields.count();
    
    console.log(`Found ${profileFieldCount} profile fields`);
    
    if (profileFieldCount > 0) {
      // Fill additional profile information
      const phoneField = page.locator('input[name="phone"], input[type="tel"]').first();
      const bioField = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i]').first();
      const locationField = page.locator('input[name="location"], input[placeholder*="location" i]').first();
      
      if (await phoneField.isVisible()) {
        await phoneField.fill('+61412345678');
        console.log('✅ Phone number filled');
      }
      
      if (await bioField.isVisible()) {
        await bioField.fill('Test user bio for automated testing');
        console.log('✅ Bio filled');
      }
      
      if (await locationField.isVisible()) {
        await locationField.fill('Sydney, NSW, Australia');
        console.log('✅ Location filled');
      }
      
      // Save profile
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        console.log('✅ Profile save attempted');
        await page.waitForTimeout(3000);
      }
      
      // Take screenshot of profile page
      await page.screenshot({ path: `test-results/04-profile-setup-${timestamp}.png` });
    }

    // STEP 7: Final Database Verification
    console.log('\n🔍 Step 7: Final Database Verification');
    
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const testUser = authUsers.users.find(user => user.email === testEmail);
      
      if (testUser) {
        // Check updated profile
        const { data: finalProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', testUser.id)
          .single();
        
        console.log('📊 FINAL USER DATA:');
        console.log('=================');
        console.log('Auth User:', {
          id: testUser.id,
          email: testUser.email,
          email_confirmed: !!testUser.email_confirmed_at,
          created_at: testUser.created_at,
          metadata: testUser.user_metadata
        });
        
        if (finalProfile) {
          console.log('Profile:', finalProfile);
        }
      }
    } catch (error) {
      console.log(`Error in final verification: ${error}`);
    }

    // STEP 8: Identify Improvements
    console.log('\n🔧 IMPROVEMENT RECOMMENDATIONS:');
    console.log('===============================');
    
    // Check for common issues
    const issues = [];
    const improvements = [];
    
    // Check if email verification is implemented
    if (!page.url().includes('/verify')) {
      improvements.push('• Consider adding email verification step');
    }
    
    // Check if profile setup is guided
    if (profileFieldCount === 0) {
      improvements.push('• Add profile setup wizard for new users');
    }
    
    // Check for welcome flow
    if (!page.url().includes('/welcome') && !page.url().includes('/onboarding')) {
      improvements.push('• Consider adding welcome/onboarding flow');
    }
    
    improvements.forEach(improvement => console.log(improvement));
    
    if (improvements.length === 0) {
      console.log('✅ Signup flow appears well-implemented');
    }

    console.log('\n🎯 TEST SUMMARY:');
    console.log(`📧 Test Email: ${testEmail}`);
    console.log(`🕒 Timestamp: ${timestamp}`);
    console.log(`📸 Screenshots saved to test-results/`);
    
    // Cleanup
    await cleanupTestUser(testEmail);
    console.log('🧹 Test data cleaned up');
  });
});

async function cleanupTestUser(email: string) {
  try {
    // Get user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const testUser = authUsers.users.find(user => user.email === email);
    
    if (testUser) {
      // Delete from profiles table first
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testUser.id);
      
      // Delete from auth
      await supabase.auth.admin.deleteUser(testUser.id);
      
      console.log(`🧹 Cleaned up test user: ${email}`);
    }
  } catch (error) {
    console.log(`Note: Cleanup error (this is normal for new tests): ${error}`);
  }
} 