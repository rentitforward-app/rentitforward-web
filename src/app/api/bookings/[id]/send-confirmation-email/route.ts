import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EmailService } from '@/lib/email-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { bookingId } = await request.json();
    const supabase = await createClient();

    // Get booking details with all related information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!listing_id (
          id,
          title,
          images,
          price_per_day,
          category,
          city,
          state
        ),
        owner_profile:owner_id (
          id,
          full_name,
          email
        ),
        renter_profile:renter_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', bookingId || params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get base URL for email links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000');
    
    // Debug base URL construction
    console.log('📧 Email Base URL Construction:');
    console.log('- NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
    console.log('- VERCEL_URL:', process.env.VERCEL_URL);
    console.log('- Final baseUrl:', baseUrl);

    // Prepare email data
    const emailData = {
      booking_id: booking.id,
      listing_title: booking.listings.title,
      listing_image: booking.listings.images?.[0] || '',
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_amount: booking.total_amount,
      renter_name: booking.renter_profile.full_name,
      renter_email: booking.renter_profile.email,
      owner_name: booking.owner_profile.full_name,
      owner_email: booking.owner_profile.email,
      listing_location: `${booking.listings.city}, ${booking.listings.state}`,
      pickup_location: booking.pickup_location || 'TBD',
      renter_message: booking.renter_message || '',
      base_url: baseUrl,
    };

    // Send confirmation email to renter
    const renterEmailResponse = await sendBookingConfirmationEmail({
      to: emailData.renter_email,
      recipientName: emailData.renter_name,
      isOwner: false,
      ...emailData,
    });

    // Send notification email to owner
    const ownerEmailResponse = await sendBookingConfirmationEmail({
      to: emailData.owner_email,
      recipientName: emailData.owner_name,
      isOwner: true,
      ...emailData,
    });

    return NextResponse.json({
      success: true,
      renterEmailSent: renterEmailResponse.success,
      ownerEmailSent: ownerEmailResponse.success,
      message: 'Confirmation emails sent successfully'
    });

  } catch (error) {
    console.error('Error sending confirmation emails:', error);
    return NextResponse.json(
      { error: 'Failed to send confirmation emails' },
      { status: 500 }
    );
  }
}

interface EmailData {
  to: string;
  recipientName: string;
  isOwner: boolean;
  booking_id: string;
  listing_title: string;
  listing_image: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  renter_name: string;
  owner_name: string;
  listing_location: string;
  pickup_location: string;
  renter_message: string;
  base_url: string;
}

async function sendBookingConfirmationEmail(data: EmailData): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Format dates
    const startDate = new Date(data.start_date).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endDate = new Date(data.end_date).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailSubject = data.isOwner 
      ? `New Booking Confirmed - ${data.listing_title}`
      : `Booking Confirmation - ${data.listing_title}`;

    const emailBody = data.isOwner 
      ? generateOwnerConfirmationEmail(data, startDate, endDate)
      : generateRenterConfirmationEmail(data, startDate, endDate);

    // Send email using the email service
    const emailService = new EmailService();
    
    const emailResult = await emailService.sendEmail({
      to: data.to,
      subject: emailSubject,
      html: emailBody,
      text: emailBody.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
    });

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return { success: false, error: emailResult.error };
    }

    console.log('✅ Email sent successfully to:', data.to, 'Message ID:', emailResult.messageId);
    return { success: true, messageId: emailResult.messageId };
  } catch (error) {
    console.error('Error preparing email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateRenterConfirmationEmail(data: EmailData, startDate: string, endDate: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #44D62C; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; }
        .button { background: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
            <p>Your rental is all set, ${data.recipientName}!</p>
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
                <li>🔔 You'll receive a confirmation email shortly</li>
                <li>💬 The host will be notified of your booking</li>
                <li>🔒 Your payment is held securely in escrow until item return</li>
                <li>📞 Message your host for coordination details</li>
            </ul>

            <h3>Host Contact</h3>
            <div class="booking-details">
                <p><strong>Host:</strong> ${data.owner_name}</p>
                <p><strong>Pickup Location:</strong> ${data.pickup_location}</p>
                ${data.renter_message ? `<p><strong>Your Message:</strong> ${data.renter_message}</p>` : ''}
            </div>

            <p>
                <a href="${data.base_url}/bookings/${data.booking_id}" class="button">
                    View Booking Details
                </a>
            </p>

            <h3>Escrow Protection</h3>
            <ul>
                <li>✅ Your payment is protected by Stripe Connect</li>
                <li>✅ Funds are held in escrow until successful item return</li>
                <li>✅ Platform fee and owner payment are automatically separated</li>
                <li>✅ Security deposit will be refunded after item return</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Need help? Contact us at support@rentitforward.com.au</p>
            <p>© 2024 Rent It Forward - Sustainable Sharing Platform</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

function generateOwnerConfirmationEmail(data: EmailData, startDate: string, endDate: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Booking - ${data.listing_title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #44D62C; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; }
        .button { background: #44D62C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 New Booking Confirmed!</h1>
            <p>Great news, ${data.recipientName}! You have a new booking.</p>
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
                <li>💬 Message the renter to coordinate pickup details</li>
                <li>📋 Review rental rules and item condition</li>
                <li>🔄 Payment will be released after successful return</li>
            </ul>

            <p>
                <a href="${data.base_url}/dashboard/bookings/${data.booking_id}" class="button">
                    Manage Booking
                </a>
            </p>

            <h3>Payment Information</h3>
            <div class="booking-details">
                <p><strong>Status:</strong> Payment confirmed and held in escrow</p>
                <p><strong>Release:</strong> Funds will be transferred to your account after successful rental completion</p>
                <p><strong>Platform Fee:</strong> Our commission is automatically deducted</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Questions? Contact us at support@rentitforward.com.au</p>
            <p>© 2024 Rent It Forward - Sustainable Sharing Platform</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}