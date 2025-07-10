# Professional OTP Email Template Setup

This guide will help you apply the custom Rent It Forward OTP verification email template in your Supabase project.

## 🎨 Template Features

The professional email template includes:
- ✅ **Brand-consistent design** using Rent It Forward colors and typography
- ✅ **Responsive layout** that works on all devices
- ✅ **Prominent OTP code display** with clear visual hierarchy
- ✅ **Professional styling** with gradients and modern design elements
- ✅ **Security notices** and clear instructions
- ✅ **Email client compatibility** with proper CSS resets

## 📋 Setup Instructions

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your **"Apps - Rent It Forward"** project

### Step 2: Navigate to Email Templates
1. In the left sidebar, click on **"Authentication"**
2. Click on **"Email Templates"** 
3. Find the **"Magic Link"** template (this is what handles signup verification)

### Step 3: Update the Magic Link Template

#### Replace the Subject Line:
```
Verify your email address - Rent It Forward
```

#### Replace the HTML Content:
Copy the entire content from `email-templates/otp-verification.html` and paste it into the HTML editor.

**Important:** Make sure to keep the `{{ .Token }}` variable in the template - this is what Supabase uses to insert the actual OTP code.

### Step 4: Test the Template
1. Click **"Save"** to apply the template
2. Test the signup flow:
   - Go to `http://localhost:3002/signup`
   - Sign up with a new email address
   - Check your email - you should now receive the professional OTP code email

## 🎯 Template Variables

The template uses these Supabase variables:
- `{{ .Token }}` - The 6-digit OTP verification code
- `{{ .SiteURL }}` - Your site URL (if needed for links)
- `{{ .Email }}` - The user's email address (if needed)

## 🎨 Design System Colors Used

The template follows the Rent It Forward design system:

| Element | Color | Usage |
|---------|-------|-------|
| Primary Brand | `#44D62C` | Header background, buttons, accents |
| Secondary Light | `#E8F8EC` | OTP code background |
| Secondary Medium | `#B8E6C1` | Borders and subtle accents |
| Text Primary | `#343C3E` | Main text content |
| Text Secondary | `#6B7280` | Supporting text |
| Background | `#F5F5F5` | Email background |
| Accent Yellow | `#FFC107` | Security notices |

## 📱 Responsive Features

The template is fully responsive with:
- Mobile-optimized font sizes
- Adjusted padding and spacing for small screens
- Flexible OTP code display
- Touch-friendly button sizes

## 🔒 Security Features

- Clear security notice about code expiration
- Warning about not sharing codes
- Professional footer with contact information
- Spam folder reminder

## 🧪 Testing Checklist

After applying the template, test:
- [ ] Email delivery and appearance
- [ ] OTP code visibility and readability
- [ ] Mobile device display
- [ ] Dark mode email clients
- [ ] Different email providers (Gmail, Outlook, Apple Mail)

## 🔧 Customization Options

If you need to customize the template further:

1. **Update Colors**: Modify the CSS variables to match any brand updates
2. **Add Logo**: Insert an image URL in the header section
3. **Modify Content**: Update the welcome message or instructions
4. **Add Links**: Include specific links to your app or support pages

## 🚀 Next Steps

Once the email template is applied:
1. ✅ Users will receive professional OTP codes instead of magic links
2. ✅ The verification flow will match your brand design
3. ✅ Email verification will work seamlessly with your signup process

## 📞 Support

If you encounter any issues:
- Check the Supabase logs for email delivery errors
- Verify that the `{{ .Token }}` variable is preserved in the template
- Test with different email providers to ensure compatibility

---

*Template designed for Rent It Forward - Professional peer-to-peer rental marketplace* 