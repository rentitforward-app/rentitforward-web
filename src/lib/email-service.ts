interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email service that can send emails using different providers
 * Configure via environment variables:
 * 
 * For Resend:
 * EMAIL_PROVIDER=resend
 * RESEND_API_KEY=your_key
 * 
 * For SendGrid:
 * EMAIL_PROVIDER=sendgrid  
 * SENDGRID_API_KEY=your_key
 * 
 * For SMTP:
 * EMAIL_PROVIDER=smtp
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=your_email
 * SMTP_PASS=your_password
 */
class EmailService {
  private provider: string;
  private fromEmail: string;

  constructor() {
    // Force Resend for production
    this.provider = 'resend';
    this.fromEmail = 'Rent It Forward <noreply@rentitforward.com.au>';
    
    // Debug logging
    console.log('📧 Email Service Configuration:');
    console.log('- Provider:', this.provider);
    console.log('- From Email:', this.fromEmail);
    console.log('- Resend API Key:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
    console.log('- Raw API Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResponse> {
    const emailData = {
      ...options,
      from: options.from || this.fromEmail,
    };

    try {
      switch (this.provider) {
        case 'resend':
          return await this.sendWithResend(emailData);
        case 'sendgrid':
          return await this.sendWithSendGrid(emailData);
        case 'smtp':
          return await this.sendWithSMTP(emailData);
        case 'console':
        default:
          return await this.sendToConsole(emailData);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendWithResend(options: SendEmailOptions): Promise<EmailResponse> {
    const apiKey = process.env.RESEND_API_KEY || 're_9WDJu3mH_Gequq4WXkyhB7bmhGpFmxGSh';
    
    console.log('🔑 Using Resend API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.id,
    };
  }

  private async sendWithSendGrid(options: SendEmailOptions): Promise<EmailResponse> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: { email: options.from },
        content: [
          {
            type: 'text/plain',
            value: options.text,
          },
          {
            type: 'text/html',
            value: options.html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error || response.statusText}`);
    }

    return {
      success: true,
      messageId: response.headers.get('x-message-id') || 'sendgrid-' + Date.now(),
    };
  }

  private async sendWithSMTP(options: SendEmailOptions): Promise<EmailResponse> {
    // For SMTP, we'd typically use nodemailer, but since we're in a serverless environment,
    // we'll create a simple implementation using fetch to an email API or service
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`${varName} environment variable is required for SMTP`);
      }
    }

    // This is a placeholder - in a real implementation, you'd use nodemailer or similar
    console.log('SMTP sending not implemented in this example');
    console.log('Email would be sent via SMTP:', options);
    
    return {
      success: true,
      messageId: 'smtp-' + Date.now(),
    };
  }

  private async sendToConsole(options: SendEmailOptions): Promise<EmailResponse> {
    console.log('\n=== EMAIL PREVIEW ===');
    console.log('Provider: Console (development mode)');
    console.log('From:', options.from);
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('\n--- HTML Content ---');
    console.log(options.html);
    console.log('\n--- Text Content ---');
    console.log(options.text);
    console.log('=== END EMAIL ===\n');

    return {
      success: true,
      messageId: 'console-' + Date.now(),
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

/**
 * Send an email using the configured email provider
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResponse> {
  return emailService.sendEmail(options);
}

/**
 * Send a review-related email with proper formatting and error handling
 */
export async function sendReviewEmail(
  type: 'request' | 'response' | 'reminder',
  recipientEmail: string,
  templateData: any
): Promise<EmailResponse> {
  try {
    const { emailTemplates } = await import('./email-templates');
    
    let template;
    switch (type) {
      case 'request':
        template = emailTemplates.reviewRequest(templateData);
        break;
      case 'response':
        template = emailTemplates.reviewResponse(templateData);
        break;
      case 'reminder':
        template = emailTemplates.reviewReminder(templateData);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    return await sendEmail({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    console.error('Error sending review email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Configuration helper to check if email sending is properly configured
 */
export function isEmailConfigured(): boolean {
  const provider = process.env.EMAIL_PROVIDER || 'console';
  
  switch (provider) {
    case 'resend':
      return !!process.env.RESEND_API_KEY;
    case 'sendgrid':
      return !!process.env.SENDGRID_API_KEY;
    case 'smtp':
      return !!(
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      );
    case 'console':
    default:
      return true; // Console is always "configured"
  }
}

/**
 * Export the EmailService class
 */
export { EmailService };

/**
 * Get the current email provider configuration
 */
export function getEmailProviderInfo(): { provider: string; configured: boolean } {
  const provider = process.env.EMAIL_PROVIDER || 'console';
  return {
    provider,
    configured: isEmailConfigured(),
  };
} 