/**
 * Payment calculation utilities based on PRICING_AND_INCENTIVES.md
 * Handles all fee calculations for the Rent It Forward platform
 */

export interface PaymentBreakdown {
  // Base pricing
  basePricePerDay: number;
  totalDays: number;
  subtotal: number;
  
  // Renter fees (what renter pays)
  renterServiceFeeRate: number; // 15%
  renterServiceFeeAmount: number;
  insuranceFee: number; // Optional
  deliveryFee: number; // Optional delivery charge
  securityDeposit: number; // Optional
  renterTotalAmount: number;
  
  // Owner earnings (what owner receives)
  ownerCommissionRate: number; // 20%
  ownerCommissionAmount: number;
  ownerNetEarnings: number;
  
  // Platform revenue
  platformTotalRevenue: number;
  
  // Points and incentives
  pointsEarned: number;
  pointsRedeemed: number;
  pointsCreditApplied: number;
  
  // Metadata
  currency: string;
  calculationVersion: string;
}

export interface PaymentCalculationInput {
  basePricePerDay: number;
  totalDays: number;
  includeInsurance?: boolean;
  insuranceFeePerDay?: number;
  deliveryFee?: number;
  securityDeposit?: number;
  pointsToRedeem?: number;
  isFirstRental?: boolean;
  currency?: string;
}

/**
 * Calculate comprehensive payment breakdown according to pricing document
 */
export function calculatePaymentBreakdown(input: PaymentCalculationInput): PaymentBreakdown {
  const {
    basePricePerDay,
    totalDays,
    includeInsurance = false,
    insuranceFeePerDay = 7, // Default $7/day as per pricing doc
    deliveryFee = 0,
    securityDeposit = 0,
    pointsToRedeem = 0,
    isFirstRental = false,
    currency = 'AUD'
  } = input;

  // Base calculation
  const subtotal = basePricePerDay * totalDays;
  
  // Renter fees (15% service fee as per pricing doc)
  const renterServiceFeeRate = 0.15;
  const renterServiceFeeAmount = subtotal * renterServiceFeeRate;
  
  // Insurance fee (optional, per day)
  const insuranceFee = includeInsurance ? insuranceFeePerDay * totalDays : 0;
  
  // Points credit (100 points = $10 AUD)
  const pointsCreditApplied = (pointsToRedeem / 100) * 10;
  
  // Renter total (before points credit)
  const renterTotalBeforeCredit = subtotal + renterServiceFeeAmount + insuranceFee + deliveryFee + securityDeposit;
  const renterTotalAmount = Math.max(0, renterTotalBeforeCredit - pointsCreditApplied);
  
  // Owner earnings (20% commission as per pricing doc)
  const ownerCommissionRate = 0.20;
  const ownerCommissionAmount = subtotal * ownerCommissionRate;
  const ownerNetEarnings = subtotal - ownerCommissionAmount;
  
  // Platform revenue (service fee from renter + commission from owner)
  const platformTotalRevenue = renterServiceFeeAmount + ownerCommissionAmount;
  
  // Points earned (100 points for first rental as per pricing doc)
  const pointsEarned = isFirstRental ? 100 : 0;
  
  return {
    basePricePerDay,
    totalDays,
    subtotal,
    renterServiceFeeRate,
    renterServiceFeeAmount,
    insuranceFee,
    deliveryFee,
    securityDeposit,
    renterTotalAmount,
    ownerCommissionRate,
    ownerCommissionAmount,
    ownerNetEarnings,
    platformTotalRevenue,
    pointsEarned,
    pointsRedeemed,
    pointsCreditApplied,
    currency,
    calculationVersion: '1.0'
  };
}

/**
 * Get security deposit recommendation based on item value
 * As per pricing document guidelines
 */
export function getDepositRecommendation(itemValue: number): {
  recommended: number;
  range: { min: number; max: number };
  tip: string;
} {
  if (itemValue < 100) {
    return {
      recommended: 0,
      range: { min: 0, max: 0 },
      tip: 'Trust-based rental; low-value risk.'
    };
  } else if (itemValue <= 500) {
    return {
      recommended: 75,
      range: { min: 50, max: 100 },
      tip: 'Enough to deter mishandling without deterring renters.'
    };
  } else {
    return {
      recommended: 200,
      range: { min: 100, max: 300 },
      tip: 'Higher deposit ensures accountability and covers potential repair costs.'
    };
  }
}

/**
 * Calculate points for various actions as per pricing document
 */
export function calculatePointsForAction(action: string, metadata?: any): number {
  switch (action) {
    case 'first_rental':
      return 100; // $10 credit
    case 'referral_first':
      return 100; // $10 credit for first referral
    case 'referral_additional':
      return 25; // $2.50 credit for additional referrals
    case 'successful_review':
      return 25; // $2.50 credit
    case 'milestone_10_rentals':
      return 25; // $2.50 credit
    case 'maintain_5_star_rating':
      return 50; // $5.00 credit
    default:
      return 0;
  }
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate payment breakdown calculations
 */
export function validatePaymentBreakdown(breakdown: PaymentBreakdown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check subtotal calculation
  const expectedSubtotal = breakdown.basePricePerDay * breakdown.totalDays;
  if (Math.abs(breakdown.subtotal - expectedSubtotal) > 0.01) {
    errors.push('Subtotal calculation is incorrect');
  }
  
  // Check renter service fee
  const expectedServiceFee = breakdown.subtotal * breakdown.renterServiceFeeRate;
  if (Math.abs(breakdown.renterServiceFeeAmount - expectedServiceFee) > 0.01) {
    errors.push('Renter service fee calculation is incorrect');
  }
  
  // Check owner commission
  const expectedCommission = breakdown.subtotal * breakdown.ownerCommissionRate;
  if (Math.abs(breakdown.ownerCommissionAmount - expectedCommission) > 0.01) {
    errors.push('Owner commission calculation is incorrect');
  }
  
  // Check owner net earnings
  const expectedNetEarnings = breakdown.subtotal - breakdown.ownerCommissionAmount;
  if (Math.abs(breakdown.ownerNetEarnings - expectedNetEarnings) > 0.01) {
    errors.push('Owner net earnings calculation is incorrect');
  }
  
  // Check platform revenue
  const expectedPlatformRevenue = breakdown.renterServiceFeeAmount + breakdown.ownerCommissionAmount;
  if (Math.abs(breakdown.platformTotalRevenue - expectedPlatformRevenue) > 0.01) {
    errors.push('Platform revenue calculation is incorrect');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create payment breakdown record for database storage
 */
export function createPaymentBreakdownRecord(
  bookingId: string,
  breakdown: PaymentBreakdown
) {
  return {
    booking_id: bookingId,
    base_price_per_day: breakdown.basePricePerDay,
    total_days: breakdown.totalDays,
    subtotal: breakdown.subtotal,
    renter_service_fee_rate: breakdown.renterServiceFeeRate,
    renter_service_fee_amount: breakdown.renterServiceFeeAmount,
    insurance_fee: breakdown.insuranceFee,
    delivery_fee: breakdown.deliveryFee,
    security_deposit: breakdown.securityDeposit,
    renter_total_amount: breakdown.renterTotalAmount,
    owner_commission_rate: breakdown.ownerCommissionRate,
    owner_commission_amount: breakdown.ownerCommissionAmount,
    owner_net_earnings: breakdown.ownerNetEarnings,
    platform_total_revenue: breakdown.platformTotalRevenue,
    points_earned: breakdown.pointsEarned,
    points_redeemed: breakdown.pointsRedeemed,
    points_credit_applied: breakdown.pointsCreditApplied,
    currency: breakdown.currency,
    calculation_version: breakdown.calculationVersion
  };
}

/**
 * Calculate Stripe amounts in cents for payment processing
 */
export function calculateStripeAmounts(breakdown: PaymentBreakdown) {
  // Total amount renter pays (including deposit)
  const totalAmountCents = Math.round(breakdown.renterTotalAmount * 100);
  
  // Platform fee (service fee from renter)
  const platformFeeCents = Math.round(breakdown.renterServiceFeeAmount * 100);
  
  // Amount that goes to owner (subtotal - owner commission)
  const ownerAmountCents = Math.round(breakdown.ownerNetEarnings * 100);
  
  return {
    totalAmountCents,
    platformFeeCents,
    ownerAmountCents,
    depositCents: Math.round(breakdown.securityDeposit * 100),
    insuranceCents: Math.round(breakdown.insuranceFee * 100)
  };
}
