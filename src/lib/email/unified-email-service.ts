import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email template data interfaces
export interface BookingEmailData {
  booking_id: string;
  listing_title: string;
  listing_image?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  renter_name: string;
  renter_email: string;
  owner_name: string;
  owner_email: string;
  listing_location: string;
  pickup_location?: string;
  renter_message?: string;
  base_url: string;
  cancellation_fee?: number;
  refund_amount?: number;
  cancellation_reason?: string;
}

export interface PaymentEmailData {
  booking_id: string;
  listing_title: string;
  owner_name: string;
  owner_email: string;
  renter_name: string;
  amount: number;
  payout_id?: string;
  base_url: string;
}

export interface MessageEmailData {
  sender_name: string;
  recipient_name: string;
  recipient_email: string;
  listing_title: string;
  booking_id: string;
  message_preview: string;
  base_url: string;
}

export interface IssueReportEmailData {
  reportId: string;
  bookingId: string;
  reporterName: string;
  reporterRole: 'owner' | 'renter';
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  listingTitle: string;
  financialImpact: boolean;
  estimatedCost: number;
  photos: string[];
  createdAt: string;
  adminUrl: string;
}

export interface ConfirmationEmailData {
  reportId: string;
  reporterName: string;
  title: string;
  bookingId: string;
  listingTitle: string;
  status: string;
  contactPreference: string;
}

export class UnifiedEmailService {
  private static instance: UnifiedEmailService;
  private fromEmail: string;

  private constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@rentitforward.com.au';
  }

  public static getInstance(): UnifiedEmailService {
    if (!UnifiedEmailService.instance) {
      UnifiedEmailService.instance = new UnifiedEmailService();
    }
    return UnifiedEmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      const result = await resend.emails.send({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        attachments: options.attachments,
      });

      if (result.error) {
        console.error('Resend email error:', result.error);
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Booking-related emails
  async sendBookingConfirmationEmail(data: BookingEmailData, isOwner: boolean): Promise<EmailResponse> {
    const recipientEmail = isOwner ? data.owner_email : data.renter_email;
    const recipientName = isOwner ? data.owner_name : data.renter_name;
    
    const subject = isOwner 
      ? `💰 New Booking Confirmed - ${data.listing_title}`
      : `🎉 Booking Confirmation - ${data.listing_title}`;

    const html = isOwner 
      ? this.generateOwnerBookingConfirmationTemplate(data)
      : this.generateRenterBookingConfirmationTemplate(data);

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  async sendBookingCancellationEmail(data: BookingEmailData, isOwner: boolean, cancelledByOwner: boolean): Promise<EmailResponse> {
    const recipientEmail = isOwner ? data.owner_email : data.renter_email;
    const recipientName = isOwner ? data.owner_name : data.renter_name;
    
    const subject = `❌ Booking Cancelled - ${data.listing_title}`;
    const html = this.generateBookingCancellationTemplate(data, isOwner, cancelledByOwner);

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  async sendPickupConfirmationEmail(data: BookingEmailData, isOwner: boolean): Promise<EmailResponse> {
    const recipientEmail = isOwner ? data.owner_email : data.renter_email;
    const recipientName = isOwner ? data.owner_name : data.renter_name;
    
    const subject = `📦 Pickup Confirmed - ${data.listing_title}`;
    const html = this.generatePickupConfirmationTemplate(data, isOwner);

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  async sendReturnConfirmationEmail(data: BookingEmailData, isOwner: boolean): Promise<EmailResponse> {
    const recipientEmail = isOwner ? data.owner_email : data.renter_email;
    const recipientName = isOwner ? data.owner_name : data.renter_name;
    
    const subject = `✅ Return Confirmed - ${data.listing_title}`;
    const html = this.generateReturnConfirmationTemplate(data, isOwner);

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  // Payment-related emails
  async sendPaymentReleaseEmail(data: PaymentEmailData): Promise<EmailResponse> {
    const subject = `💰 Payment Released - ${data.listing_title}`;
    const html = this.generatePaymentReleaseTemplate(data);

    return this.sendEmail({
      to: data.owner_email,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  async sendPaymentReceivedEmail(data: PaymentEmailData): Promise<EmailResponse> {
    const subject = `💳 Payment Processed - ${data.listing_title}`;
    const html = this.generatePaymentReceivedTemplate(data);

    return this.sendEmail({
      to: data.renter_name, // This should be renter_email
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  // Message notification emails
  async sendMessageNotificationEmail(data: MessageEmailData): Promise<EmailResponse> {
    const subject = `💬 New Message - ${data.listing_title}`;
    const html = this.generateMessageNotificationTemplate(data);

    return this.sendEmail({
      to: data.recipient_email,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  // Issue report emails (existing)
  async sendAdminIssueNotification(data: IssueReportEmailData): Promise<EmailResponse> {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@rentitforward.com.au'];
    
    const subject = `🚨 ${this.getSeverityEmoji(data.severity)} Issue Report - ${data.title}`;
    const html = this.generateAdminEmailTemplate(data);

    return this.sendEmail({
      to: adminEmails,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  async sendReporterConfirmation(data: ConfirmationEmailData, reporterEmail: string): Promise<EmailResponse> {
    const subject = `Issue Report Submitted - ${data.title}`;
    const html = this.generateConfirmationEmailTemplate(data);

    return this.sendEmail({
      to: reporterEmail,
      subject,
      html,
      replyTo: 'support@rentitforward.com.au',
    });
  }

  // Template generators
  private generateRenterBookingConfirmationTemplate(data: BookingEmailData): string {
    const startDate = new Date(data.start_date).toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const endDate = new Date(data.end_date).toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Confirmation</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
            <p>Your rental is all set!</p>
        </div>
        
        <div class="content">
            <h2>Booking Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>Location:</strong> ${data.listing_location}</p>
                <p><strong>Rental Period:</strong></p>
                <p>📅 <strong>Start:</strong> ${startDate}</p>
                <p>📅 <strong>End:</strong> ${endDate}</p>
                <p><strong>Total Paid:</strong> $${data.total_amount.toFixed(2)} AUD</p>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
            </div>

            <h3>What's Next?</h3>
            <ul>
                <li>💬 The host will be notified of your booking</li>
                <li>🔒 Your payment is held securely until the item is returned</li>
                <li>📞 Message the host to organize pickup and drop-off</li>
            </ul>

            <h3>Host Contact</h3>
            <div class="booking-details">
                <p><strong>Host:</strong> ${data.owner_name}</p>
                <p><strong>Pickup Location:</strong> ${data.pickup_location || 'TBD'}</p>
                ${data.renter_message ? `<p><strong>Your Message:</strong> ${data.renter_message}</p>` : ''}
            </div>

            <p>
                <a href="${data.base_url}/bookings/${data.booking_id}" class="button">
                    View Booking Details
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  private generateOwnerBookingConfirmationTemplate(data: BookingEmailData): string {
    const startDate = new Date(data.start_date).toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const endDate = new Date(data.end_date).toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Booking - ${data.listing_title}</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 New Booking Confirmed!</h1>
            <p>Great news! You have a new booking.</p>
        </div>
        
        <div class="content">
            <h2>Booking Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>Renter:</strong> ${data.renter_name}</p>
                <p><strong>Rental Period:</strong></p>
                <p>📅 <strong>Start:</strong> ${startDate}</p>
                <p>📅 <strong>End:</strong> ${endDate}</p>
                <p><strong>Total Amount:</strong> $${data.total_amount.toFixed(2)} AUD</p>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
            </div>

            ${data.renter_message ? `
            <h3>Message from Renter</h3>
            <div class="booking-details">
                <p>${data.renter_message}</p>
            </div>
            ` : ''}

            <h3>Next Steps</h3>
            <ul>
                <li>🏠 Prepare the item for pickup/delivery</li>
                <li>💬 Message the renter to organize pickup and drop-off</li>
                <li>📋 Review rental rules and item condition</li>
                <li>🔄 Payment will be released after successful return</li>
            </ul>

            <p>
                <a href="${data.base_url}/dashboard/bookings/${data.booking_id}" class="button">
                    Manage Booking
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  private generateBookingCancellationTemplate(data: BookingEmailData, isOwner: boolean, cancelledByOwner: boolean): string {
    const cancelledBy = cancelledByOwner ? 'host' : 'renter';
    const otherParty = isOwner ? data.renter_name : data.owner_name;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Cancelled</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header" style="background: #ef4444;">
            <h1>❌ Booking Cancelled</h1>
            <p>Your booking has been cancelled</p>
        </div>
        
        <div class="content">
            <h2>Cancellation Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
                <p><strong>Cancelled by:</strong> ${cancelledBy === 'host' ? 'Host' : 'Renter'} (${otherParty})</p>
                ${data.cancellation_reason ? `<p><strong>Reason:</strong> ${data.cancellation_reason}</p>` : ''}
                ${data.cancellation_fee ? `<p><strong>Cancellation Fee:</strong> $${data.cancellation_fee.toFixed(2)} AUD</p>` : ''}
                ${data.refund_amount ? `<p><strong>Refund Amount:</strong> $${data.refund_amount.toFixed(2)} AUD</p>` : ''}
            </div>

            <h3>What Happens Next?</h3>
            <ul>
                <li>💰 Refunds will be processed within 3-5 business days</li>
                <li>📧 You'll receive a separate email when the refund is complete</li>
                <li>🔍 You can view the full cancellation details in your dashboard</li>
            </ul>

            <p>
                <a href="${data.base_url}/bookings/${data.booking_id}" class="button">
                    View Cancellation Details
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  private generatePickupConfirmationTemplate(data: BookingEmailData, isOwner: boolean): string {
    const action = isOwner ? 'handed over' : 'picked up';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Pickup Confirmed</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header" style="background: #10b981;">
            <h1>📦 Pickup Confirmed!</h1>
            <p>The item has been ${action}</p>
        </div>
        
        <div class="content">
            <h2>Pickup Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
                <p><strong>Pickup Date:</strong> ${new Date().toLocaleDateString('en-AU')}</p>
                <p><strong>${isOwner ? 'Renter' : 'Host'}:</strong> ${isOwner ? data.renter_name : data.owner_name}</p>
            </div>

            <h3>What's Next?</h3>
            <ul>
                ${isOwner ? 
                  '<li>🔄 The rental period has officially started</li><li>💰 Payment will be released after successful return</li><li>📞 Stay in touch with the renter for any questions</li>' :
                  '<li>🎉 Enjoy your rental!</li><li>📋 Please take care of the item as agreed</li><li>🔄 Remember to return it on time</li>'
                }
            </ul>

            <p>
                <a href="${data.base_url}/bookings/${data.booking_id}" class="button">
                    View Booking Details
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  private generateReturnConfirmationTemplate(data: BookingEmailData, isOwner: boolean): string {
    const action = isOwner ? 'received back' : 'returned';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Return Confirmed</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header" style="background: #10b981;">
            <h1>✅ Return Confirmed!</h1>
            <p>The item has been ${action}</p>
        </div>
        
        <div class="content">
            <h2>Return Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
                <p><strong>Return Date:</strong> ${new Date().toLocaleDateString('en-AU')}</p>
                <p><strong>${isOwner ? 'Renter' : 'Host'}:</strong> ${isOwner ? data.renter_name : data.owner_name}</p>
            </div>

            <h3>What's Next?</h3>
            <ul>
                ${isOwner ? 
                  '<li>💰 Payment will be released to your account within 24 hours</li><li>⭐ Consider leaving a review for the renter</li><li>📊 Check your earnings in the dashboard</li>' :
                  '<li>🎉 Rental completed successfully!</li><li>💰 Any security deposit will be refunded within 24 hours</li><li>⭐ Consider leaving a review for the host</li>'
                }
            </ul>

            <p>
                <a href="${data.base_url}/bookings/${data.booking_id}" class="button">
                    View Booking Details
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  private generatePaymentReleaseTemplate(data: PaymentEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Released</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header" style="background: #10b981;">
            <h1>💰 Payment Released!</h1>
            <p>Your earnings have been transferred</p>
        </div>
        
        <div class="content">
            <h2>Payment Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
                <p><strong>Renter:</strong> ${data.renter_name}</p>
                <p><strong>Amount Released:</strong> $${data.amount.toFixed(2)} AUD</p>
                ${data.payout_id ? `<p><strong>Payout ID:</strong> ${data.payout_id}</p>` : ''}
                <p><strong>Transfer Date:</strong> ${new Date().toLocaleDateString('en-AU')}</p>
            </div>

            <h3>Payment Information</h3>
            <ul>
                <li>💳 Funds have been transferred to your connected account</li>
                <li>🏦 It may take 1-3 business days to appear in your bank account</li>
                <li>📊 View your earnings history in the dashboard</li>
                <li>📧 You'll receive a separate receipt for tax purposes</li>
            </ul>

            <p>
                <a href="${data.base_url}/dashboard/earnings" class="button">
                    View Earnings Dashboard
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  private generatePaymentReceivedTemplate(data: PaymentEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Processed</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header" style="background: #3b82f6;">
            <h1>💳 Payment Processed!</h1>
            <p>Your payment has been successfully processed</p>
        </div>
        
        <div class="content">
            <h2>Payment Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
                <p><strong>Host:</strong> ${data.owner_name}</p>
                <p><strong>Amount Charged:</strong> $${data.amount.toFixed(2)} AUD</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString('en-AU')}</p>
            </div>

            <h3>Payment Protection</h3>
            <ul>
                <li>🔒 Your payment is held securely until the rental is complete</li>
                <li>✅ Funds will only be released to the host after successful return</li>
                <li>🛡️ You're protected by our secure payment system</li>
                <li>💰 Any security deposit will be refunded after return</li>
            </ul>

            <p>
                <a href="${data.base_url}/bookings/${data.booking_id}" class="button">
                    View Booking Details
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  private generateMessageNotificationTemplate(data: MessageEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Message</title>
    ${this.getEmailStyles()}
</head>
<body>
    <div class="container">
        <div class="header" style="background: #8b5cf6;">
            <h1>💬 New Message!</h1>
            <p>You have a new message about your booking</p>
        </div>
        
        <div class="content">
            <h2>Message Details</h2>
            <div class="booking-details">
                <h3>${data.listing_title}</h3>
                <p><strong>From:</strong> ${data.sender_name}</p>
                <p><strong>Booking ID:</strong> ${data.booking_id}</p>
            </div>

            <div class="booking-details" style="background: #f3f4f6; border-left: 4px solid #8b5cf6;">
                <h4>Message Preview:</h4>
                <p style="font-style: italic;">"${data.message_preview}"</p>
            </div>

            <h3>Quick Actions</h3>
            <ul>
                <li>💬 Reply to continue the conversation</li>
                <li>📞 Coordinate pickup and return details</li>
                <li>❓ Ask any questions about the rental</li>
            </ul>

            <p>
                <a href="${data.base_url}/messages/${data.booking_id}" class="button">
                    View & Reply to Message
                </a>
            </p>
        </div>
        
        ${this.getEmailFooter()}
    </div>
</body>
</html>`;
  }

  // Existing issue report templates (keeping the same)
  private generateAdminEmailTemplate(data: IssueReportEmailData): string {
    // ... (keeping the existing implementation from the original file)
    const severityColor = this.getSeverityColor(data.severity);
    const issueTypeFormatted = this.formatIssueType(data.issueType);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Issue Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #44D62C 0%, #3AB827 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #6b7280; }
          .severity-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: white; background-color: ${severityColor}; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .info-item { padding: 15px; background: #f9fafb; border-radius: 6px; }
          .info-label { font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 5px; }
          .info-value { color: #6b7280; font-size: 14px; }
          .description-box { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${severityColor}; }
          .action-button { display: inline-block; background: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .financial-impact { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .photos-info { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
          @media (max-width: 600px) {
            .info-grid { grid-template-columns: 1fr; }
            .container { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🚨 New Issue Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate attention required</p>
          </div>
          
          <div class="content">
            <div style="text-align: center; margin-bottom: 30px;">
              <span class="severity-badge">${data.severity} Priority</span>
            </div>
            
            <h2 style="color: #111827; margin-bottom: 10px;">${data.title}</h2>
            <p style="color: #6b7280; margin-bottom: 20px;">
              <strong>Issue Type:</strong> ${issueTypeFormatted} • 
              <strong>Report ID:</strong> ${data.reportId}
            </p>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">📋 Booking Details</div>
                <div class="info-value">
                  <strong>${data.listingTitle}</strong><br>
                  Booking ID: ${data.bookingId}
                </div>
              </div>
              
              <div class="info-item">
                <div class="info-label">👤 Reporter</div>
                <div class="info-value">
                  <strong>${data.reporterName}</strong><br>
                  Role: ${data.reporterRole.charAt(0).toUpperCase() + data.reporterRole.slice(1)}
                </div>
              </div>
              
              <div class="info-item">
                <div class="info-label">📅 Reported</div>
                <div class="info-value">
                  ${new Date(data.createdAt).toLocaleString('en-AU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Australia/Melbourne'
                  })}
                </div>
              </div>
              
              <div class="info-item">
                <div class="info-label">⚡ Severity</div>
                <div class="info-value">
                  <span style="color: ${severityColor}; font-weight: 600;">
                    ${data.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            ${data.financialImpact ? `
              <div class="financial-impact">
                <strong>💰 Financial Impact Reported</strong><br>
                Estimated Cost: <strong>$${data.estimatedCost.toFixed(2)} AUD</strong>
              </div>
            ` : ''}
            
            ${data.photos.length > 0 ? `
              <div class="photos-info">
                <strong>📸 Evidence Attached</strong><br>
                ${data.photos.length} photo${data.photos.length !== 1 ? 's' : ''} uploaded for review
              </div>
            ` : ''}
            
            <div class="description-box">
              <h3 style="margin: 0 0 15px 0; color: #111827;">Issue Description</h3>
              <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.adminUrl}" class="action-button">
                🔍 View Full Report & Take Action
              </a>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin-top: 30px;">
              <h4 style="margin: 0 0 10px 0; color: #374151;">⚡ Quick Actions Needed:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li>Review the full report and evidence</li>
                <li>Contact the reporter if clarification is needed</li>
                <li>Investigate the issue with the other party</li>
                <li>Update the report status as you progress</li>
                ${data.financialImpact ? '<li><strong>Handle financial impact assessment</strong></li>' : ''}
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Rent It Forward Admin System</p>
            <p>For urgent issues, please respond within 2 hours during business hours</p>
            <p style="margin-top: 15px;">
              <a href="mailto:support@rentitforward.com.au" style="color: #44D62C;">support@rentitforward.com.au</a> • 
              <a href="tel:+61400000000" style="color: #44D62C;">+61 400 000 000</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateConfirmationEmailTemplate(data: ConfirmationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Issue Report Confirmation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #44D62C 0%, #3AB827 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #6b7280; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: white; background-color: #3b82f6; }
          .info-box { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .next-steps { background: #dbeafe; border: 1px solid #3b82f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">✅ Report Submitted Successfully</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">We've received your issue report</p>
          </div>
          
          <div class="content">
            <div style="text-align: center; margin-bottom: 30px;">
              <span class="status-badge">${data.status}</span>
            </div>
            
            <p>Hi ${data.reporterName},</p>
            
            <p>Thank you for reporting this issue. We've received your report and our admin team will review it shortly.</p>
            
            <div class="info-box">
              <h3 style="margin: 0 0 15px 0; color: #111827;">Report Details</h3>
              <p style="margin: 5px 0;"><strong>Report ID:</strong> ${data.reportId}</p>
              <p style="margin: 5px 0;"><strong>Title:</strong> ${data.title}</p>
              <p style="margin: 5px 0;"><strong>Booking:</strong> ${data.listingTitle}</p>
              <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${data.bookingId}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>
            </div>
            
            <div class="next-steps">
              <h3 style="margin: 0 0 15px 0; color: #1e40af;">What happens next?</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Our admin team will review your report within 24 hours</li>
                <li>We may contact you for additional information if needed</li>
                <li>We'll investigate the issue with all parties involved</li>
                <li>You'll receive updates via your preferred contact method (${data.contactPreference})</li>
                <li>We'll work towards a fair resolution for all parties</li>
              </ol>
            </div>
            
            <p>We'll contact you via your preferred method (<strong>${data.contactPreference}</strong>) with updates on the investigation and resolution.</p>
            
            <p>If you need to add additional information or have urgent concerns, please contact our support team directly.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin-top: 30px;">
              <h4 style="margin: 0 0 10px 0; color: #374151;">Need immediate assistance?</h4>
              <p style="margin: 0; color: #6b7280;">
                For urgent matters, contact us directly:<br>
                📧 <a href="mailto:support@rentitforward.com.au" style="color: #44D62C;">support@rentitforward.com.au</a><br>
                📞 <a href="tel:+61400000000" style="color: #44D62C;">+61 400 000 000</a>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for helping us maintain a safe and reliable rental community</p>
            <p>Rent It Forward Support Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper methods
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  }

  private formatIssueType(type: string): string {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private getEmailStyles(): string {
    return `
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #44D62C 0%, #3AB827 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px; color: #6b7280; }
        .booking-details { background: #f9fafb; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #44D62C; }
        .button { display: inline-block; background: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        .button:hover { background: #3AB827; }
        h1, h2, h3 { color: #111827; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
        @media (max-width: 600px) {
            .container { padding: 10px; }
            .content { padding: 20px; }
        }
    </style>`;
  }

  private getEmailFooter(): string {
    return `
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:support@rentitforward.com.au" style="color: #44D62C;">support@rentitforward.com.au</a></p>
            <p>© 2024 Rent It Forward - Sustainable Sharing Platform</p>
        </div>`;
  }
}

export const unifiedEmailService = UnifiedEmailService.getInstance();
