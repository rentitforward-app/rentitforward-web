import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '@/lib/email-service';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize email service
const emailService = new EmailService();

// In-memory rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // Max 5 requests per 15 minutes

  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// reCAPTCHA verification
async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    });
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

// Content analysis for suspicious patterns
function analyzeContent(text: string): { isSuspicious: boolean; reasons: string[] } {
  const suspiciousPatterns = [
    { pattern: /viagra|cialis|levitra/i, reason: 'Pharmaceutical spam' },
    { pattern: /casino|poker|betting/i, reason: 'Gambling content' },
    { pattern: /loan|credit|debt/i, reason: 'Financial spam' },
    { pattern: /http:\/\/[^\s]+/i, reason: 'URLs in message' },
    { pattern: /[A-Z]{10,}/g, reason: 'Excessive caps' },
    { pattern: /[!]{3,}/g, reason: 'Excessive exclamation marks' },
    { pattern: /[?]{3,}/g, reason: 'Excessive question marks' },
    { pattern: /[0-9]{10,}/g, reason: 'Excessive numbers' },
    { pattern: /[^\w\s]{20,}/g, reason: 'Excessive special characters' }
  ];

  const reasons: string[] = [];
  let isSuspicious = false;

  suspiciousPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      reasons.push(reason);
      isSuspicious = true;
    }
  });

  return { isSuspicious, reasons };
}

// Input sanitization for Node.js
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/file:/gi, ''); // Remove file: protocol
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      email, 
      subject, 
      message, 
      timestamp, 
      jsEnabled, 
      captchaToken,
      website, // Honeypot field
      confirm_email // Honeypot field
    } = body;

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 1. RATE LIMITING
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. BASIC VALIDATION
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // 3. HONEYPOT DETECTION
    if (website || confirm_email) {
      console.log('Bot detected via honeypot:', { website, confirm_email, clientIP });
      return NextResponse.json(
        { error: 'Invalid submission' },
        { status: 400 }
      );
    }

    // 4. JAVASCRIPT CHALLENGE
    if (jsEnabled !== 'true') {
      console.log('JavaScript disabled submission:', { clientIP });
      return NextResponse.json(
        { error: 'JavaScript must be enabled' },
        { status: 400 }
      );
    }

    // 5. TIMESTAMP VALIDATION
    if (!timestamp) {
      return NextResponse.json(
        { error: 'Invalid submission timestamp' },
        { status: 400 }
      );
    }

    const submissionTime = Date.now() - parseInt(timestamp);
    // Rate limiting check removed - reCAPTCHA provides sufficient spam protection

    if (submissionTime > 300000) { // More than 5 minutes
      console.log('Submission too old:', { submissionTime, clientIP });
      return NextResponse.json(
        { error: 'Form session expired. Please refresh and try again.' },
        { status: 400 }
      );
    }

    // 6. reCAPTCHA VERIFICATION
    if (!captchaToken) {
      return NextResponse.json(
        { error: 'reCAPTCHA verification required' },
        { status: 400 }
      );
    }

    const isValidCaptcha = await verifyCaptcha(captchaToken);
    if (!isValidCaptcha) {
      console.log('Invalid reCAPTCHA:', { clientIP });
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed' },
        { status: 400 }
      );
    }

    // 7. ENHANCED EMAIL VALIDATION
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 8. INPUT SANITIZATION
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedSubject = sanitizeInput(subject);
    const sanitizedMessage = sanitizeInput(message);

    // 9. CONTENT ANALYSIS
    const contentAnalysis = analyzeContent(sanitizedMessage + ' ' + sanitizedSubject);
    if (contentAnalysis.isSuspicious) {
      console.log('Suspicious content detected:', { 
        reasons: contentAnalysis.reasons, 
        clientIP,
        email: sanitizedEmail 
      });
      return NextResponse.json(
        { error: 'Message contains suspicious content' },
        { status: 400 }
      );
    }

    // 10. LENGTH VALIDATION
    if (sanitizedFirstName.length > 50 || sanitizedLastName.length > 50) {
      return NextResponse.json(
        { error: 'Name too long' },
        { status: 400 }
      );
    }

    if (sanitizedEmail.length > 100) {
      return NextResponse.json(
        { error: 'Email too long' },
        { status: 400 }
      );
    }

    if (sanitizedSubject.length > 100) {
      return NextResponse.json(
        { error: 'Subject too long' },
        { status: 400 }
      );
    }

    if (sanitizedMessage.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long' },
        { status: 400 }
      );
    }

    // 11. SAVE TO DATABASE
    const { data: submission, error: dbError } = await supabase
      .from('contact_form_submissions')
      .insert({
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
        email: sanitizedEmail,
        subject: sanitizedSubject,
        message: sanitizedMessage,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save contact form submission' },
        { status: 500 }
      );
    }

    // 12. SEND EMAIL NOTIFICATION TO ADMIN
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #44D62C;">New Contact Form Submission</h2>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Contact Details:</h3>
          <p><strong>Name:</strong> ${sanitizedFirstName} ${sanitizedLastName}</p>
          <p><strong>Email:</strong> ${sanitizedEmail}</p>
          <p><strong>Subject:</strong> ${sanitizedSubject}</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Message:</h3>
          <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
        </div>
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            <strong>Submission ID:</strong> ${submission.id}<br>
            <strong>Submitted:</strong> ${new Date().toLocaleString()}<br>
            <strong>IP Address:</strong> ${clientIP}
          </p>
        </div>
      </div>
    `;

    const adminEmailText = `
New Contact Form Submission

Name: ${sanitizedFirstName} ${sanitizedLastName}
Email: ${sanitizedEmail}
Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}

Submission ID: ${submission.id}
Submitted: ${new Date().toLocaleString()}
IP Address: ${clientIP}
    `;

    // 13. SEND CONFIRMATION EMAIL TO SENDER
    const senderEmailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header with Branding -->
        <div style="background: linear-gradient(135deg, #44D62C 0%, #3AC625 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Rent It Forward</h1>
          <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Share More, Buy Less</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <!-- Thank You Section -->
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #44D62C;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">Thank You for Contacting Us!</h2>
            <p style="color: #475569; margin: 0 0 10px 0; font-size: 16px; line-height: 1.6;">Hi ${sanitizedFirstName},</p>
            <p style="color: #475569; margin: 0; font-size: 16px; line-height: 1.6;">We've received your message and will get back to you as soon as possible. Our team typically responds within 24 hours during business days.</p>
          </div>
          
          <!-- Your Message Details -->
          <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
              <span style="display: inline-block; width: 8px; height: 8px; background-color: #44D62C; border-radius: 50%; margin-right: 12px;"></span>
              Your Message Details
            </h3>
            <div style="margin-bottom: 15px;">
              <span style="color: #64748b; font-weight: 500; font-size: 14px;">Subject:</span>
              <span style="color: #1e293b; font-weight: 600; margin-left: 8px; font-size: 16px;">${sanitizedSubject}</span>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="color: #475569; margin: 0; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${sanitizedMessage}</p>
            </div>
          </div>
          
          <!-- What Happens Next -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #bbf7d0;">
            <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">What Happens Next?</h3>
            <ul style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Our support team will review your inquiry</li>
              <li>We'll respond with a detailed answer or next steps</li>
              <li>If needed, we may ask for additional information</li>
            </ul>
          </div>
          
          <!-- Need Immediate Help -->
          <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Need Immediate Help?</h3>
            <p style="color: #475569; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">While you wait for our response, you can:</p>
            <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Check our <a href="https://rentitforward.com.au/faq" style="color: #44D62C; text-decoration: none; font-weight: 500;">FAQ section</a></li>
              <li>Browse our <a href="https://rentitforward.com.au/how-it-works" style="color: #44D62C; text-decoration: none; font-weight: 500;">How It Works guide</a></li>
              <li>Explore available items on our <a href="https://rentitforward.com.au/browse" style="color: #44D62C; text-decoration: none; font-weight: 500;">browse page</a></li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0 0 10px 0; font-size: 16px;">Best regards,</p>
            <p style="color: #1e293b; margin: 0; font-size: 18px; font-weight: 600;">The Rent It Forward Team</p>
          </div>
        </div>
        
        <!-- Bottom Banner -->
        <div style="background-color: #f0fdf4; padding: 20px; text-align: center; border-top: 1px solid #bbf7d0;">
          <div style="display: inline-block; background-color: #ffffff; padding: 15px 25px; border-radius: 8px; border: 1px solid #bbf7d0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
              <strong>Submission Reference:</strong> ${submission.id}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleDateString('en-AU', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })} ${new Date().toLocaleTimeString('en-AU', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}<br>
              <strong>Rent It Forward Pty Ltd</strong><br>
              <strong>ABN:</strong> 79 150 200 910<br>
              <strong>Australia</strong>
            </p>
          </div>
        </div>
        
        <!-- Disclaimer -->
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
            This is an automated confirmation email. Please do not reply to this email.<br>
            If you need immediate assistance, please contact us through our website.
          </p>
        </div>
      </div>
    `;

    const senderEmailText = `
Thank you for contacting Rent It Forward!

Hi ${sanitizedFirstName},

We've received your message and will get back to you as soon as possible. Our team typically responds within 24 hours during business days.

Your Message:
Subject: ${sanitizedSubject}
${sanitizedMessage}

What Happens Next?
- Our support team will review your inquiry
- We'll respond with a detailed answer or next steps
- If needed, we may ask for additional information

Need Immediate Help?
While you wait for our response, you can:
- Check our FAQ section
- Browse our How It Works guide
- Explore available items on our browse page

Best regards,
The Rent It Forward Team

Submission Reference: ${submission.id}
Submitted: ${new Date().toLocaleDateString('en-AU', { 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit' 
})} ${new Date().toLocaleTimeString('en-AU', { 
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit' 
})}

Rent It Forward Pty Ltd
ABN: 79 150 200 910
Australia

This is an automated confirmation email. Please do not reply to this email.
If you need immediate assistance, please contact us through our website.
    `;

    // 14. SEND BOTH EMAILS
    const emailPromises = [
      emailService.sendEmail({
        to: 'hello@rentitforward.com.au',
        subject: `New Contact Form Submission: ${sanitizedSubject}`,
        html: adminEmailHtml,
        text: adminEmailText,
      }),
      emailService.sendEmail({
        to: sanitizedEmail,
        subject: `Thank you for contacting Rent It Forward - ${sanitizedSubject}`,
        html: senderEmailHtml,
        text: senderEmailText,
      })
    ];

    const emailResults = await Promise.allSettled(emailPromises);
    emailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Email ${index === 0 ? 'admin' : 'sender'} failed:`, result.reason);
      }
    });

    // 15. LOG SUCCESSFUL SUBMISSION
    console.log('Contact form submission successful:', {
      submissionId: submission.id,
      email: sanitizedEmail,
      clientIP,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
      submissionId: submission.id,
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
