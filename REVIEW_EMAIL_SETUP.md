# Review Email System Setup

This document explains how to configure and use the automated review email system in Rent It Forward.

## Overview

The review email system automatically sends:
- **Review requests** when a booking is completed
- **Review reminders** 7 days after completion (if no review submitted)
- **Review response notifications** when someone responds to a review

## Email Provider Configuration

### Option 1: Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Set environment variables:
   ```env
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=your_resend_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Option 2: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key with mail send permissions
3. Set environment variables:
   ```env
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=your_sendgrid_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Option 3: SMTP (Gmail, etc.)

1. Set up app-specific password for your email account
2. Set environment variables:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   FROM_EMAIL=your_email@gmail.com
   ```

### Option 4: Console (Development)

For development/testing, emails will be logged to console:
```env
EMAIL_PROVIDER=console
```

## Required Environment Variables

```env
# Base application URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Email configuration (choose one provider above)
EMAIL_PROVIDER=resend
FROM_EMAIL=noreply@yourdomain.com

# Cron job security
CRON_SECRET=your_secure_random_string
```

## Setting Up Automated Review Reminders

### 1. Deploy the Cron Endpoint

The review reminder system uses the API endpoint:
```
GET /api/cron/review-reminders
```

### 2. Configure Cron Job

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/review-reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

#### Option B: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- GitHub Actions

Configure to call your endpoint daily:
```bash
curl -X GET "https://yourdomain.com/api/cron/review-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Test the System

1. **Test email configuration:**
   ```bash
   # Check if emails are properly configured
   curl "https://yourdomain.com/api/test-email"
   ```

2. **Test review reminders manually:**
   ```bash
   curl -X GET "https://yourdomain.com/api/cron/review-reminders" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

## Email Templates

The system includes three email templates:

### 1. Review Request (sent immediately after booking completion)
- Sent to both renter and owner
- Includes direct link to review form
- Explains importance of reviews

### 2. Review Reminder (sent 7 days after completion)
- Only sent if no review submitted yet
- Includes urgency messaging
- Shows days remaining (7 out of 14)

### 3. Review Response (sent when someone responds to a review)
- Notifies original reviewer
- Includes link to view response
- Encourages dialogue

## Customizing Email Templates

Email templates are located in:
```
src/lib/email-templates.ts
```

You can customize:
- Subject lines
- HTML styling
- Message content
- Call-to-action buttons

## Timeline

- **Day 0**: Booking completed → Review request emails sent
- **Day 7**: If no review → Reminder email sent
- **Day 14**: Review window closes (no more emails)

## Monitoring

### Email Delivery Status

Check the application logs for:
```
Review request email sent successfully: [messageId]
Failed to send review request email: [error]
```

### Review Reminder Analytics

The cron job returns statistics:
```json
{
  "message": "Review reminders processed",
  "sent": 12,
  "bookingsChecked": 25,
  "results": [...]
}
```

## User Preferences

Users can opt out of reminder emails by updating their notification preferences in their account settings.

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check EMAIL_PROVIDER configuration
   - Verify API keys are correct
   - Check FROM_EMAIL domain is verified

2. **Cron job not running**
   - Verify CRON_SECRET matches
   - Check cron service configuration
   - Review application logs

3. **Users not receiving emails**
   - Check spam folders
   - Verify email addresses in database
   - Check delivery logs

### Debug Mode

Set `EMAIL_PROVIDER=console` to see email content in application logs without actually sending emails.

## Security Considerations

1. **Protect cron endpoint** with CRON_SECRET
2. **Verify email domains** with your provider
3. **Monitor sending limits** to avoid rate limiting
4. **Handle bounced emails** appropriately

## Support

For additional help:
1. Check application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with console provider first to verify templates
4. Contact your email provider for delivery issues 