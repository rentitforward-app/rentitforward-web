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

interface ListingApprovalEmailData {
  ownerName: string;
  listingTitle: string;
  listingId: string;
  viewListingUrl: string;
  dashboardUrl: string;
}

interface ListingRejectionEmailData {
  ownerName: string;
  listingTitle: string;
  listingId: string;
  rejectionReason: string;
  editListingUrl: string;
  supportUrl: string;
}

interface ListingDisableEmailData {
  ownerName: string;
  listingTitle: string;
  listingId: string;
  disableReason: string;
  editListingUrl: string;
  supportUrl: string;
}

interface ListingReapprovalEmailData {
  ownerName: string;
  listingTitle: string;
  listingId: string;
  viewListingUrl: string;
  dashboardUrl: string;
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
 * Email template for listing approval notifications
 */
export function createListingApprovalEmail(data: ListingApprovalEmailData): EmailTemplate {
  const { ownerName, listingTitle, viewListingUrl, dashboardUrl } = data;
  
  const subject = `🎉 Your listing "${listingTitle}" has been approved!`;
  
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
        .button { background-color: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin: 10px 5px; }
        .button-secondary { background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin: 10px 5px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .success-box { background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #44D62C; margin: 20px 0; }
        .tip-box { background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .celebration { font-size: 24px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Listing Approved!</h1>
        </div>
        
        <div class="content">
          <div class="celebration">🌟✨🎊</div>
          
          <h2>Congratulations, ${ownerName}!</h2>
          
          <div class="success-box">
            <p><strong>Great news!</strong> Your listing <strong>"${listingTitle}"</strong> has been approved and is now live on Rent It Forward!</p>
          </div>
          
          <p>Your listing is now visible to thousands of potential renters in our community. Here's what happens next:</p>
          
          <ul>
            <li>🔍 <strong>Discoverable:</strong> Your listing will appear in search results</li>
            <li>📱 <strong>Bookable:</strong> Users can now request to rent your item</li>
            <li>💰 <strong>Earning potential:</strong> Start generating income from your listing</li>
            <li>📊 <strong>Analytics:</strong> Track views and booking requests in your dashboard</li>
          </ul>
          
          <div class="tip-box">
            <p><strong>💡 Pro Tips for Success:</strong></p>
            <ul>
              <li>Respond quickly to booking requests</li>
              <li>Keep your availability calendar updated</li>
              <li>Provide clear instructions for pickup/delivery</li>
              <li>Maintain your item in great condition</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${viewListingUrl}" class="button">View Your Live Listing</a>
            <a href="${dashboardUrl}" class="button-secondary">Go to Dashboard</a>
          </div>
          
          <p>Thank you for being part of the Rent It Forward community! Together, we're building a more sustainable future through sharing.</p>
          
          <p style="color: #6c757d; font-size: 14px;">
            Need help getting started? Check out our <a href="/help" style="color: #44D62C;">owner resources</a> or contact our support team.
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Rent It Forward</p>
          <p>Happy sharing! 🌱</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
🎉 Congratulations, ${ownerName}!

Great news! Your listing "${listingTitle}" has been approved and is now live on Rent It Forward!

Your listing is now visible to thousands of potential renters in our community. Here's what happens next:

🔍 Discoverable: Your listing will appear in search results
📱 Bookable: Users can now request to rent your item  
💰 Earning potential: Start generating income from your listing
📊 Analytics: Track views and booking requests in your dashboard

💡 Pro Tips for Success:
- Respond quickly to booking requests
- Keep your availability calendar updated
- Provide clear instructions for pickup/delivery
- Maintain your item in great condition

View your live listing: ${viewListingUrl}
Go to dashboard: ${dashboardUrl}

Thank you for being part of the Rent It Forward community! Together, we're building a more sustainable future through sharing.

Need help getting started? Visit our help center or contact support.

Best regards,
The Rent It Forward Team

Happy sharing! 🌱
  `;
  
  return { subject, html, text };
}

/**
 * Email template for listing rejection notifications
 */
export function createListingRejectionEmail(data: ListingRejectionEmailData): EmailTemplate {
  const { ownerName, listingTitle, rejectionReason, editListingUrl, supportUrl } = data;
  
  const subject = `Action needed: "${listingTitle}" requires updates`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #ffffff; }
        .button { background-color: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin: 10px 5px; }
        .button-secondary { background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin: 10px 5px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .rejection-box { background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0; }
        .help-box { background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 Listing Needs Updates</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${ownerName},</h2>
          
          <p>Thank you for submitting your listing <strong>"${listingTitle}"</strong>. Our team has reviewed it and found some areas that need attention before it can go live.</p>
          
          <div class="rejection-box">
            <h3>📋 What needs to be updated:</h3>
            <p><strong>${rejectionReason}</strong></p>
          </div>
          
          <p>Don't worry! These updates are usually quick to make, and once completed, your listing will be reviewed again promptly.</p>
          
          <div class="help-box">
            <p><strong>💡 Common listing tips:</strong></p>
            <ul>
              <li>Use clear, well-lit photos showing the item from multiple angles</li>
              <li>Write detailed descriptions including condition and specifications</li>
              <li>Set competitive pricing based on similar items</li>
              <li>Ensure your item meets our community guidelines</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${editListingUrl}" class="button">Edit Your Listing</a>
            <a href="${supportUrl}" class="button-secondary">Get Help</a>
          </div>
          
          <p>We're here to help you succeed! Once you've made the updates, your listing will be automatically resubmitted for review.</p>
          
          <p style="color: #6c757d; font-size: 14px;">
            Questions about the feedback? Our support team is ready to help you get your listing approved.
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent by Rent It Forward</p>
          <p>We're here to help you succeed! 🚀</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hi ${ownerName},

Thank you for submitting your listing "${listingTitle}". Our team has reviewed it and found some areas that need attention before it can go live.

📋 What needs to be updated:
${rejectionReason}

Don't worry! These updates are usually quick to make, and once completed, your listing will be reviewed again promptly.

💡 Common listing tips:
- Use clear, well-lit photos showing the item from multiple angles
- Write detailed descriptions including condition and specifications  
- Set competitive pricing based on similar items
- Ensure your item meets our community guidelines

Edit your listing: ${editListingUrl}
Get help: ${supportUrl}

We're here to help you succeed! Once you've made the updates, your listing will be automatically resubmitted for review.

Questions about the feedback? Our support team is ready to help you get your listing approved.

Best regards,
The Rent It Forward Team

We're here to help you succeed! 🚀
  `;
  
  return { subject, html, text };
}

/**
 * Email template for listing disable notifications (when approved listing is disabled)
 */
export function createListingDisableEmail(data: ListingDisableEmailData): EmailTemplate {
  const { ownerName, listingTitle, disableReason, editListingUrl, supportUrl } = data;
  
  const subject = `⚠️ Your listing "${listingTitle}" has been disabled`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; background: white; }
        .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .warning-box h3 { color: #92400e; margin: 0 0 10px 0; }
        .btn { 
          display: inline-block; 
          background: #44D62C; 
          color: white; 
          text-decoration: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          margin: 10px 5px;
          font-weight: bold;
        }
        .btn-secondary { background: #6b7280; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Listing Disabled</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${ownerName},</h2>
          
          <p>We need to let you know that your listing <strong>"${listingTitle}"</strong> has been disabled by our admin team.</p>
          
          <div class="warning-box">
            <h3>📋 Reason for Disable:</h3>
            <p>${disableReason}</p>
          </div>
          
          <h3>🛠️ What you can do:</h3>
          <ul>
            <li><strong>Review and Edit:</strong> Make the necessary changes to address the concerns</li>
            <li><strong>Resubmit:</strong> Once updated, your listing will be reviewed again</li>
            <li><strong>Contact Support:</strong> If you have questions, we're here to help</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${editListingUrl}" class="btn">Edit Your Listing</a>
            <a href="${supportUrl}" class="btn btn-secondary">Contact Support</a>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">💡 Quick Tips:</h4>
            <ul style="margin: 0; color: #6b7280; font-size: 14px;">
              <li>Ensure all photos are clear and well-lit</li>
              <li>Write detailed, accurate descriptions</li>
              <li>Set fair and competitive pricing</li>
              <li>Follow our community guidelines</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">We appreciate your understanding and look forward to seeing your updated listing!</p>
          
          <p>Best regards,<br>The Rent It Forward Team</p>
        </div>
        
        <div class="footer">
          <p>© 2024 Rent It Forward. All rights reserved.</p>
          <p>This email was sent regarding your listing activity.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Hi ${ownerName},
    
    Your listing "${listingTitle}" has been disabled by our admin team.
    
    Reason: ${disableReason}
    
    What you can do:
    - Review and edit your listing: ${editListingUrl}
    - Contact our support team: ${supportUrl}
    
    We appreciate your understanding and look forward to seeing your updated listing!
    
    Best regards,
    The Rent It Forward Team
  `;
  
  return { subject, html, text };
}

/**
 * Email template for listing re-approval notifications
 */
export function createListingReapprovalEmail(data: ListingReapprovalEmailData): EmailTemplate {
  const { ownerName, listingTitle, viewListingUrl, dashboardUrl } = data;
  
  const subject = `🎉 Great news! "${listingTitle}" has been re-approved!`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #44D62C, #22c55e); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; background: white; }
        .success-box { background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .success-box h3 { color: #15803d; margin: 0 0 10px 0; }
        .btn { 
          display: inline-block; 
          background: #44D62C; 
          color: white; 
          text-decoration: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          margin: 10px 5px;
          font-weight: bold;
        }
        .btn-secondary { background: #6b7280; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Listing Re-approved!</h1>
        </div>
        
        <div class="content">
          <h2>Fantastic news, ${ownerName}!</h2>
          
          <p>Your listing <strong>"${listingTitle}"</strong> has been re-approved and is now live on Rent It Forward! 🚀</p>
          
          <div class="success-box">
            <h3>✅ Your listing is now:</h3>
            <ul style="margin: 10px 0; color: #15803d;">
              <li>Visible to potential renters</li>
              <li>Searchable on our platform</li>
              <li>Ready to start earning you money!</li>
            </ul>
          </div>
          
          <h3>🚀 What's next:</h3>
          <ul>
            <li><strong>Share your listing:</strong> Tell friends and family about your rental</li>
            <li><strong>Optimize for bookings:</strong> Consider competitive pricing and great photos</li>
            <li><strong>Monitor your dashboard:</strong> Track views, inquiries, and bookings</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${viewListingUrl}" class="btn">View Your Listing</a>
            <a href="${dashboardUrl}" class="btn btn-secondary">Go to Dashboard</a>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">💡 Pro Tips for Success:</h4>
            <ul style="margin: 0; color: #6b7280; font-size: 14px;">
              <li>Respond quickly to renter inquiries</li>
              <li>Keep your calendar updated</li>
              <li>Provide excellent customer service</li>
              <li>Ask satisfied renters for reviews</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">Thank you for your patience during the review process. We're excited to see your listing succeed!</p>
          
          <p>Happy renting,<br>The Rent It Forward Team</p>
        </div>
        
        <div class="footer">
          <p>© 2024 Rent It Forward. All rights reserved.</p>
          <p>This email was sent regarding your listing activity.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Fantastic news, ${ownerName}!
    
    Your listing "${listingTitle}" has been re-approved and is now live on Rent It Forward!
    
    Your listing is now:
    - Visible to potential renters
    - Searchable on our platform  
    - Ready to start earning you money!
    
    Next steps:
    - View your listing: ${viewListingUrl}
    - Check your dashboard: ${dashboardUrl}
    
    Thank you for your patience during the review process. We're excited to see your listing succeed!
    
    Happy renting,
    The Rent It Forward Team
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
  listingApproval: createListingApprovalEmail,
  listingRejection: createListingRejectionEmail,
  listingDisable: createListingDisableEmail,
  listingReapproval: createListingReapprovalEmail,
}; 