import jsPDF from 'jspdf';

interface PaymentBreakdown {
  base_price_per_day: number;
  total_days: number;
  subtotal: number;
  renter_service_fee_rate: number;
  renter_service_fee_amount: number;
  insurance_fee: number;
  delivery_fee: number;
  security_deposit: number;
  renter_total_amount: number;
  owner_commission_rate: number;
  owner_commission_amount: number;
  owner_net_earnings: number;
  platform_total_revenue: number;
  points_earned: number;
  points_redeemed: number;
  points_credit_applied: number;
  currency: string;
  calculation_version: string;
}

interface Booking {
  id: string;
  total_amount: number;
  subtotal: number;
  service_fee: number;
  delivery_fee: number;
  start_date: string;
  end_date: string;
  status: string;
  delivery_method: string;
  delivery_address?: string;
  pickup_address?: string;
  special_instructions?: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  created_at: string;
  listings: {
    title: string;
    images: string[];
    owner_id: string;
    category: string;
    price_per_day: number;
  };
  renter_profile?: {
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  owner_profile?: {
    full_name: string;
    avatar_url?: string;
    email: string;
  };
}

export interface ReceiptData {
  booking: Booking;
  paymentBreakdown: PaymentBreakdown | null;
  viewType: 'renter' | 'owner' | 'admin';
}

export function generateReceiptPDF(data: ReceiptData): void {
  const { booking, paymentBreakdown, viewType } = data;
  
  // Create new PDF document
  const pdf = new jsPDF();
  
  // Set up colors
  const primaryGreen = '#44D62C';
  const darkGray = '#1F2937';
  const lightGray = '#6B7280';
  
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
  pdf.setTextColor(primaryGreen);
  pdf.text('Rent It Forward', 20, yPosition);
  
  pdf.setFontSize(16);
  pdf.setTextColor(darkGray);
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
  pdf.setTextColor(darkGray);
  pdf.text('Booking Details', 20, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(lightGray);
  
  // Item name
  pdf.text('Item:', 20, yPosition);
  pdf.setTextColor(darkGray);
  pdf.text(booking.listings.title, 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray);
  pdf.text('Booking ID:', 20, yPosition);
  pdf.setTextColor(darkGray);
  pdf.text(booking.id.slice(-8).toUpperCase(), 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray);
  pdf.text('Rental Period:', 20, yPosition);
  pdf.setTextColor(darkGray);
  pdf.text(`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`, 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray);
  pdf.text('Duration:', 20, yPosition);
  pdf.setTextColor(darkGray);
  const totalDays = paymentBreakdown?.total_days || Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24));
  pdf.text(`${totalDays} days`, 50, yPosition);
  
  // Host information (for renter view)
  if (viewType === 'renter' && booking.owner_profile) {
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setTextColor(darkGray);
    pdf.text('Your Host', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(lightGray);
    pdf.text('Name:', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(booking.owner_profile.full_name, 50, yPosition);
    
    yPosition += 8;
    pdf.setTextColor(lightGray);
    pdf.text('Email:', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(booking.owner_profile.email, 50, yPosition);
  }
  
  // Renter information (for owner/admin view)
  if ((viewType === 'owner' || viewType === 'admin') && booking.renter_profile) {
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setTextColor(darkGray);
    pdf.text('Renter Information', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(lightGray);
    pdf.text('Name:', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(booking.renter_profile.full_name, 50, yPosition);
    
    yPosition += 8;
    pdf.setTextColor(lightGray);
    pdf.text('Email:', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(booking.renter_profile.email, 50, yPosition);
  }
  
  // Payment breakdown section
  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setTextColor(darkGray);
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
  pdf.setTextColor(lightGray);
  pdf.text(`Base Price (${totalDays} days)`, 20, yPosition);
  pdf.setTextColor(darkGray);
  pdf.text(formatCurrency(breakdown.subtotal), 150, yPosition, { align: 'right' });
  
  yPosition += 8;
  pdf.setTextColor(lightGray);
  pdf.text('Service Fee (15%)', 20, yPosition);
  pdf.setTextColor(darkGray);
  pdf.text(formatCurrency(breakdown.renter_service_fee_amount), 150, yPosition, { align: 'right' });
  
  // Delivery fee (if applicable)
  if (breakdown.delivery_fee > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray);
    pdf.text('Delivery Fee', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(formatCurrency(breakdown.delivery_fee), 150, yPosition, { align: 'right' });
  }
  
  // Insurance fee (if applicable)
  if (breakdown.insurance_fee > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray);
    pdf.text('Insurance Fee', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(formatCurrency(breakdown.insurance_fee), 150, yPosition, { align: 'right' });
  }
  
  // Security deposit (if applicable)
  if (breakdown.security_deposit > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray);
    pdf.text('Security Deposit', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(formatCurrency(breakdown.security_deposit), 150, yPosition, { align: 'right' });
  }
  
  // Points credit (if applicable)
  if (breakdown.points_credit_applied > 0) {
    yPosition += 8;
    pdf.setTextColor(lightGray);
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
  pdf.setTextColor(darkGray);
  pdf.text('Total Paid', 20, yPosition);
  pdf.setTextColor(primaryGreen);
  pdf.text(formatCurrency(breakdown.renter_total_amount), 150, yPosition, { align: 'right' });
  
  // Owner earnings section (for owner/admin view only - NOT for renters)
  if ((viewType === 'owner' || viewType === 'admin') && paymentBreakdown) {
    yPosition += 20;
    pdf.setFontSize(14);
    pdf.setTextColor(darkGray);
    pdf.text('Owner Earnings', 20, yPosition);
    
    yPosition += 5;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, yPosition, 190, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(lightGray);
    pdf.text('Base Amount', 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(formatCurrency(paymentBreakdown.subtotal), 150, yPosition, { align: 'right' });
    
    yPosition += 8;
    pdf.setTextColor(lightGray);
    pdf.text(`Platform Commission (${(paymentBreakdown.owner_commission_rate * 100).toFixed(0)}%)`, 20, yPosition);
    pdf.setTextColor(darkGray);
    pdf.text(`-${formatCurrency(paymentBreakdown.owner_commission_amount)}`, 150, yPosition, { align: 'right' });
    
    yPosition += 12;
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, yPosition, 190, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setTextColor(darkGray);
    pdf.text('Net Earnings', 20, yPosition);
    pdf.setTextColor(primaryGreen);
    pdf.text(formatCurrency(paymentBreakdown.owner_net_earnings), 150, yPosition, { align: 'right' });
  }
  
  // Transaction details section
  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setTextColor(darkGray);
  pdf.text('Transaction Details', 20, yPosition);
  
  yPosition += 5;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(20, yPosition, 190, yPosition);
  
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(lightGray);
  pdf.text('Payment Method:', 20, yPosition);
  pdf.setTextColor(darkGray);
  pdf.text('Stripe', 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray);
  pdf.text('Transaction ID:', 20, yPosition);
  pdf.setTextColor(darkGray);
  const transactionId = booking.stripe_payment_intent_id || booking.stripe_session_id || 'N/A';
  pdf.text(transactionId.slice(-12), 50, yPosition);
  
  yPosition += 8;
  pdf.setTextColor(lightGray);
  pdf.text('Date & Time:', 20, yPosition);
  pdf.setTextColor(darkGray);
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
  pdf.setTextColor(lightGray);
  pdf.text('Currency:', 20, yPosition);
  pdf.setTextColor(darkGray);
  pdf.text('AUD', 50, yPosition);
  
  // Footer
  yPosition += 25;
  pdf.setFontSize(8);
  pdf.setTextColor(lightGray);
  pdf.text('This is an official receipt from Rent It Forward.', 20, yPosition);
  yPosition += 5;
  pdf.text('For support, contact us at support@rentitforward.com.au', 20, yPosition);
  yPosition += 5;
  pdf.text(`Generated on ${new Date().toLocaleDateString('en-AU')} at ${new Date().toLocaleTimeString('en-AU')}`, 20, yPosition);
  
  // Save the PDF
  const fileName = `rent-it-forward-receipt-${booking.id.slice(-8)}.pdf`;
  pdf.save(fileName);
}
