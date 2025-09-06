import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    // Await params
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking with payment breakdown
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings (
          title,
          images,
          category,
          price_per_day
        ),
        profiles:renter_id (
          full_name,
          avatar_url,
          email
        ),
        owner_profile:owner_id (
          full_name,
          avatar_url,
          email
        ),
        payment_breakdowns (
          *
        )
      `)
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user has permission to view this booking
    const isRenter = booking.renter_id === user.id;
    const isOwner = booking.owner_id === user.id;
    
    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.email === 'admin@rentitforward.com' || 
                   userProfile?.email === 'rentitforward.app@gmail.com';

    if (!isRenter && !isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Determine view type
    let viewType: 'renter' | 'owner' | 'admin' = 'renter';
    if (isAdmin) {
      viewType = 'admin';
    } else if (isOwner) {
      viewType = 'owner';
    }

    // Generate PDF
    const pdf = generateReceiptPDF({
      booking,
      paymentBreakdown: booking.payment_breakdowns?.[0] || null,
      viewType
    });

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rent-it-forward-receipt-${booking.id.slice(-8)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF receipt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PDF generation function (server-side version)
function generateReceiptPDF(data: any): jsPDF {
  const { booking, paymentBreakdown, viewType } = data;
  
  // Create new PDF document
  const pdf = new jsPDF();
  
  // Set up colors (RGB values for jsPDF)
  const primaryGreen = [68, 214, 44];
  const darkGray = [31, 41, 55];
  const lightGray = [107, 114, 128];
  
  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };
  
  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  let yPosition = 20;
  
  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.text('Rent It Forward', 20, yPosition);
  
  pdf.setFontSize(16);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  yPosition += 10;
  pdf.text('Payment Receipt', 20, yPosition);
  
  // Receipt status badge
  yPosition += 15;
  pdf.setFontSize(10);
  pdf.setFillColor(34, 197, 94); // Green background
  pdf.rect(20, yPosition - 5, 25, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('CONFIRMED', 22, yPosition);
  
  // Booking details section
  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Booking Details', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  
  // Item name
  pdf.text('Item:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text(booking.listings.title, 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Booking ID:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text(booking.id.slice(-8).toUpperCase(), 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Rental Period:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text(`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`, 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Duration:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const totalDays = paymentBreakdown?.total_days || Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24));
  pdf.text(`${totalDays} days`, 50, yPosition);
  
  // Host information (for renter view)
  if (viewType === 'renter' && booking.owner_profile) {
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text('Your Host', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Name:', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(booking.owner_profile.full_name, 50, yPosition);
    
    yPosition += 8;
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Email:', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(booking.owner_profile.email, 50, yPosition);
  }
  
  // Renter information (for owner/admin view)
  if ((viewType === 'owner' || viewType === 'admin') && booking.renter_profile) {
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text('Renter Information', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Name:', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(booking.renter_profile.full_name, 50, yPosition);
    
    yPosition += 8;
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Email:', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(booking.renter_profile.email, 50, yPosition);
  }
  
  // Payment breakdown section
  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Payment Breakdown', 20, yPosition);
  
  // Draw line separator
  yPosition += 5;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(20, yPosition, 190, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(10);
  
  const breakdown = paymentBreakdown || {
    subtotal: booking.subtotal,
    renter_service_fee_amount: booking.service_fee,
    delivery_fee: booking.delivery_fee,
    renter_total_amount: booking.total_amount,
    insurance_fee: 0,
    security_deposit: 0,
    points_credit_applied: 0,
  };
  
  // Base price
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text(`Base Price (${totalDays} days)`, 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text(formatCurrency(breakdown.subtotal), 150, yPosition, { align: 'right' });
  
  yPosition += 8;
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Service Fee (15%)', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text(formatCurrency(breakdown.renter_service_fee_amount), 150, yPosition, { align: 'right' });
  
  // Delivery fee (if applicable)
  if (breakdown.delivery_fee > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Delivery Fee', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(formatCurrency(breakdown.delivery_fee), 150, yPosition, { align: 'right' });
  }
  
  // Insurance fee (if applicable)
  if (breakdown.insurance_fee > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Insurance Fee', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(formatCurrency(breakdown.insurance_fee), 150, yPosition, { align: 'right' });
  }
  
  // Security deposit (if applicable)
  if (breakdown.security_deposit > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Security Deposit', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(formatCurrency(breakdown.security_deposit), 150, yPosition, { align: 'right' });
  }
  
  // Points credit (if applicable)
  if (breakdown.points_credit_applied > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Points Credit Applied', 20, yPosition);
    pdf.setTextColor(34, 197, 94); // Green for discount
    pdf.text(`-${formatCurrency(breakdown.points_credit_applied)}`, 150, yPosition, { align: 'right' });
  }
  
  // Total line
  yPosition += 12;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(20, yPosition, 190, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Total Paid', 20, yPosition);
  pdf.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  pdf.text(formatCurrency(breakdown.renter_total_amount), 150, yPosition, { align: 'right' });
  
  // Owner earnings section (for owner/admin view only - NOT for renters)
  if ((viewType === 'owner' || viewType === 'admin') && paymentBreakdown) {
    yPosition += 20;
    pdf.setFontSize(14);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text('Owner Earnings', 20, yPosition);
    
    yPosition += 5;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, yPosition, 190, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text('Base Amount', 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(formatCurrency(paymentBreakdown.subtotal), 150, yPosition, { align: 'right' });
    
    yPosition += 8;
    pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.text(`Platform Commission (${(paymentBreakdown.owner_commission_rate * 100).toFixed(0)}%)`, 20, yPosition);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text(`-${formatCurrency(paymentBreakdown.owner_commission_amount)}`, 150, yPosition, { align: 'right' });
    
    yPosition += 12;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, yPosition, 190, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    pdf.text('Net Earnings', 20, yPosition);
    pdf.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    pdf.text(formatCurrency(paymentBreakdown.owner_net_earnings), 150, yPosition, { align: 'right' });
  }
  
  // Transaction details section
  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Transaction Details', 20, yPosition);
  
  yPosition += 5;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(20, yPosition, 190, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Payment Method:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('Stripe', 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Transaction ID:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const transactionId = booking.stripe_payment_intent_id || booking.stripe_session_id || 'N/A';
  pdf.text(transactionId.slice(-12), 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Date & Time:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const paymentDate = new Date(booking.created_at).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ', ' + new Date(booking.created_at).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  pdf.text(paymentDate, 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('Currency:', 20, yPosition);
  pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  pdf.text('AUD', 50, yPosition);
  
  // Footer
  yPosition += 25;
  pdf.setFontSize(8);
  pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.text('This is an official receipt from Rent It Forward.', 20, yPosition);
  yPosition += 5;
  pdf.text('For support, contact us at support@rentitforward.com.au', 20, yPosition);
  yPosition += 5;
  pdf.text(`Generated on ${new Date().toLocaleDateString('en-AU')} at ${new Date().toLocaleTimeString('en-AU')}`, 20, yPosition);
  
  return pdf;
}
