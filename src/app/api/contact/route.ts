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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, subject, message } = body;

    // Basic validation
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Save to database
    const { data: submission, error: dbError } = await supabase
      .from('contact_form_submissions')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        subject,
        message,
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

    // Send email notification to admin
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #44D62C; border-bottom: 2px solid #44D62C; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Contact Details</h3>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Message</h3>
          <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 8px; font-size: 14px; color: #666;">
          <p style="margin: 0;"><strong>Submission ID:</strong> ${submission.id}</p>
          <p style="margin: 5px 0 0 0;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>This email was sent from the Rent It Forward contact form.</p>
        </div>
      </div>
    `;

    const adminEmailText = `
New Contact Form Submission

Contact Details:
- Name: ${firstName} ${lastName}
- Email: ${email}
- Subject: ${subject}

Message:
${message}

Submission ID: ${submission.id}
Submitted: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}

This message was sent from the Rent It Forward contact form.
    `;

    // Send confirmation email to sender
    const senderEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #44D62C; margin: 0;">Rent It Forward</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Share More, Buy Less</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 12px; text-align: center;">
          <h2 style="color: #333; margin-top: 0;">Thank You for Contacting Us!</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Hi ${firstName},<br><br>
            We've received your message and will get back to you as soon as possible. 
            Our team typically responds within 24 hours during business days.
          </p>
        </div>
        
        <div style="background-color: #fff; padding: 25px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Your Message Details</h3>
          <div style="text-align: left;">
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0;">
              <p style="margin: 0; line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
        </div>
        
        <div style="background-color: #44D62C; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">What Happens Next?</h3>
          <ul style="text-align: left; margin: 0; padding-left: 20px;">
            <li>Our support team will review your inquiry</li>
            <li>We'll respond with a detailed answer or next steps</li>
            <li>If needed, we may ask for additional information</li>
          </ul>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #333; margin-top: 0;">Need Immediate Help?</h4>
          <p style="color: #555; margin-bottom: 15px;">
            While you wait for our response, you can:
          </p>
          <ul style="color: #555; margin: 0; padding-left: 20px;">
            <li>Check our <a href="https://rentitforward.com.au/faq" style="color: #44D62C;">FAQ section</a> for quick answers</li>
            <li>Browse our <a href="https://rentitforward.com.au/how-it-works" style="color: #44D62C;">How It Works</a> guide</li>
            <li>Explore available items on our <a href="https://rentitforward.com.au/browse" style="color: #44D62C;">browse page</a></li>
          </ul>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="margin: 0;"><strong>Submission Reference:</strong> ${submission.id}</p>
          <p style="margin: 5px 0 0 0;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
          <p style="margin: 15px 0 0 0;">
            <strong>Rent It Forward Pty Ltd</strong><br>
            ABN: 79 150 200 910<br>
            Australia
          </p>
        </div>
      </div>
    `;

    const senderEmailText = `
Thank You for Contacting Rent It Forward!

Hi ${firstName},

We've received your message and will get back to you as soon as possible. 
Our team typically responds within 24 hours during business days.

Your Message Details:
- Subject: ${subject}
- Message: ${message}

What Happens Next?
- Our support team will review your inquiry
- We'll respond with a detailed answer or next steps
- If needed, we may ask for additional information

Need Immediate Help?
While you wait for our response, you can:
- Check our FAQ section for quick answers
- Browse our How It Works guide
- Explore available items on our browse page

Submission Reference: ${submission.id}
Submitted: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}

Rent It Forward Pty Ltd
ABN: 79 150 200 910
Australia

Share More, Buy Less
    `;

    // Send both emails
    const emailPromises = [
      // Send notification to admin
      emailService.sendEmail({
        to: 'hello@rentitforward.com.au',
        subject: `New Contact Form Submission: ${subject}`,
        html: adminEmailHtml,
        text: adminEmailText,
      }),
      
      // Send confirmation to sender
      emailService.sendEmail({
        to: email,
        subject: `Thank you for contacting Rent It Forward - ${subject}`,
        html: senderEmailHtml,
        text: senderEmailText,
      })
    ];

    // Wait for both emails to be sent
    const emailResults = await Promise.allSettled(emailPromises);
    
    // Log results but don't fail the request if emails fail
    emailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Email ${index === 0 ? 'admin' : 'sender'} failed:`, result.reason);
      }
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
