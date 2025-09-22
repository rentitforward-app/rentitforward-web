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

export class EmailService {
  private static instance: EmailService;
  private fromEmail: string;

  private constructor() {
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@rentitforward.com';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

  async sendAdminIssueNotification(data: IssueReportEmailData): Promise<{ success: boolean; error?: string }> {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@rentitforward.com'];
    
    const subject = `🚨 ${this.getSeverityEmoji(data.severity)} Issue Report - ${data.title}`;
    const html = this.generateAdminEmailTemplate(data);

    const result = await this.sendEmail({
      to: adminEmails,
      subject,
      html,
      replyTo: 'support@rentitforward.com',
    });

    return result;
  }

  async sendReporterConfirmation(data: ConfirmationEmailData, reporterEmail: string): Promise<{ success: boolean; error?: string }> {
    const subject = `Issue Report Submitted - ${data.title}`;
    const html = this.generateConfirmationEmailTemplate(data);

    const result = await this.sendEmail({
      to: reporterEmail,
      subject,
      html,
      replyTo: 'support@rentitforward.com',
    });

    return result;
  }

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

  private generateAdminEmailTemplate(data: IssueReportEmailData): string {
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
              <a href="mailto:support@rentitforward.com" style="color: #44D62C;">support@rentitforward.com</a> • 
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
                📧 <a href="mailto:support@rentitforward.com" style="color: #44D62C;">support@rentitforward.com</a><br>
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
}

export const emailService = EmailService.getInstance();

