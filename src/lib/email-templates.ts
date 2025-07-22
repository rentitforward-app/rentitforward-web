interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface ReviewRequestEmailData {
  recipientName: string;
  listingTitle: string;
  otherPartyName: string;
  reviewType: 'renter' | 'owner';
  bookingId: string;
  actionUrl: string;
}

interface ReviewResponseEmailData {
  recipientName: string;
  responderName: string;
  listingTitle: string;
  reviewId: string;
  actionUrl: string;
}

interface ReviewReminderEmailData {
  recipientName: string;
  listingTitle: string;
  otherPartyName: string;
  reviewType: 'renter' | 'owner';
  daysRemaining: number;
  actionUrl: string;
}

/**
 * Email template for review requests sent when a booking is completed
 */
export function createReviewRequestEmail(data: ReviewRequestEmailData): EmailTemplate {
  const { recipientName, listingTitle, otherPartyName, reviewType, actionUrl } = data;
  
  const subject = `Please review your ${reviewType === 'renter' ? 'rental experience' : 'renter'} - ${listingTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background-color: #44D62C; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #ffffff; }
        .button { background-color: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
        .button:hover { background-color: #3AB827; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .rating-stars { color: #ffc107; font-size: 20px; margin: 10px 0; }
        .highlight { background-color: #f0fdf4; padding: 15px; border-left: 4px solid #44D62C; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌟 How was your experience?</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${recipientName},</h2>
          
          <p>Thank you for ${reviewType === 'renter' ? 'renting' : 'sharing'} <strong>"${listingTitle}"</strong>!</p>
          
          <div class="highlight">
            <p><strong>Your feedback matters!</strong> Help other community members by sharing your experience with ${otherPartyName}.</p>
          </div>
          
          <p>Your review helps:</p>
          <ul>
            <li>🤝 Build trust in our community</li>
            <li>📈 Improve the quality of listings</li>
            <li>✨ Help others make informed decisions</li>
            ${reviewType === 'renter' 
              ? '<li>🏆 Support great listing owners</li>' 
              : '<li>🎯 Recognize responsible renters</li>'
            }
          </ul>
          
          <div class="rating-stars">⭐⭐⭐⭐⭐</div>
          
          <p>Writing a review takes just 2 minutes:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" class="button">Leave a Review</a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            Reviews can be left within 14 days of your booking completion. 
            ${reviewType === 'renter' 
              ? 'Rate your experience with the item and the owner\'s service.' 
              : 'Rate your experience with the renter\'s care of your item.'
            }
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Rent It Forward</p>
          <p>If you no longer wish to receive review request emails, you can update your preferences in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hi ${recipientName},

Thank you for ${reviewType === 'renter' ? 'renting' : 'sharing'} "${listingTitle}"!

Your feedback matters! Help other community members by sharing your experience with ${otherPartyName}.

Your review helps:
- Build trust in our community
- Improve the quality of listings  
- Help others make informed decisions
${reviewType === 'renter' ? '- Support great listing owners' : '- Recognize responsible renters'}

Writing a review takes just 2 minutes. Please visit: ${actionUrl}

Reviews can be left within 14 days of your booking completion.

Best regards,
The Rent It Forward Team

---
If you no longer wish to receive review request emails, you can update your preferences in your account settings.
  `;
  
  return { subject, html, text };
}

/**
 * Email template for review responses
 */
export function createReviewResponseEmail(data: ReviewResponseEmailData): EmailTemplate {
  const { recipientName, responderName, listingTitle, actionUrl } = data;
  
  const subject = `${responderName} responded to your review - ${listingTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background-color: #44D62C; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #ffffff; }
        .button { background-color: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .response-box { background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 New Response to Your Review</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${recipientName},</h2>
          
          <p><strong>${responderName}</strong> has responded to the review you left for <strong>"${listingTitle}"</strong>.</p>
          
          <div class="response-box">
            <p><strong>💡 Tip:</strong> Responses help create meaningful dialogue and show that our community values feedback!</p>
          </div>
          
          <p>You can view the response and continue the conversation:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" class="button">View Response</a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px;">
            Responses foster open communication and help build trust within our community.
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Rent It Forward</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hi ${recipientName},

${responderName} has responded to the review you left for "${listingTitle}".

Responses help create meaningful dialogue and show that our community values feedback!

View the response: ${actionUrl}

Best regards,
The Rent It Forward Team
  `;
  
  return { subject, html, text };
}

/**
 * Email template for review reminders
 */
export function createReviewReminderEmail(data: ReviewReminderEmailData): EmailTemplate {
  const { recipientName, listingTitle, otherPartyName, reviewType, daysRemaining, actionUrl } = data;
  
  const subject = `Reminder: ${daysRemaining} days left to review "${listingTitle}"`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #ffffff; }
        .button { background-color: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .urgency-box { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Review Reminder</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${recipientName},</h2>
          
          <div class="urgency-box">
            <p><strong>Only ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left!</strong></p>
            <p>Don't miss your chance to review your ${reviewType === 'renter' ? 'rental experience' : 'renter'} with ${otherPartyName} for <strong>"${listingTitle}"</strong>.</p>
          </div>
          
          <p>Your review:</p>
          <ul>
            <li>🌟 Helps build trust in our community</li>
            <li>📝 Takes just 2 minutes to complete</li>
            <li>🚀 Makes a real difference for future ${reviewType === 'renter' ? 'renters' : 'owners'}</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" class="button">Leave Review Now</a>
          </div>
          
          <p style="color: #dc2626; font-weight: 600;">
            ⚠️ Reviews can only be left within 14 days of booking completion.
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Rent It Forward</p>
          <p>You can unsubscribe from reminder emails in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hi ${recipientName},

REMINDER: Only ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left!

Don't miss your chance to review your ${reviewType === 'renter' ? 'rental experience' : 'renter'} with ${otherPartyName} for "${listingTitle}".

Your review:
- Helps build trust in our community
- Takes just 2 minutes to complete  
- Makes a real difference for future ${reviewType === 'renter' ? 'renters' : 'owners'}

Leave your review: ${actionUrl}

⚠️ Reviews can only be left within 14 days of booking completion.

Best regards,
The Rent It Forward Team

---
You can unsubscribe from reminder emails in your account settings.
  `;
  
  return { subject, html, text };
}

/**
 * Main export for all email template functions
 */
export const emailTemplates = {
  reviewRequest: createReviewRequestEmail,
  reviewResponse: createReviewResponseEmail,
  reviewReminder: createReviewReminderEmail,
}; 