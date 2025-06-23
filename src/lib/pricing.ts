// Pricing utility functions for Rent It Forward
// Updated rates: 15% service fee, 20% commission, 10% insurance

export interface PricingCalculation {
  basePrice: number;
  serviceFee: number;
  insurance: number;
  securityDeposit: number;
  totalRenterPays: number;
  platformCommission: number;
  ownerReceives: number;
  dailyRate: number;
  numberOfDays: number;
}

export interface PricingInput {
  dailyRate: number;
  numberOfDays: number;
  includeInsurance: boolean;
  securityDeposit?: number;
}

// Platform rates
export const PLATFORM_RATES = {
  SERVICE_FEE_PERCENT: 0.15, // 15% added to renter total
  COMMISSION_PERCENT: 0.20,  // 20% deducted from owner payout
  INSURANCE_PERCENT: 0.10,   // 10% of daily rate per day
  POINTS_TO_CREDIT_RATE: 0.10, // 100 points = $10 AUD
} as const;

/**
 * Calculate complete booking pricing breakdown
 */
export function calculateBookingPricing(input: PricingInput): PricingCalculation {
  const { dailyRate, numberOfDays, includeInsurance, securityDeposit = 0 } = input;
  
  // Base calculations
  const basePrice = dailyRate * numberOfDays;
  const serviceFee = basePrice * PLATFORM_RATES.SERVICE_FEE_PERCENT;
  const insurance = includeInsurance ? (dailyRate * PLATFORM_RATES.INSURANCE_PERCENT * numberOfDays) : 0;
  
  // Renter total
  const totalRenterPays = basePrice + serviceFee + insurance + securityDeposit;
  
  // Owner calculations
  const platformCommission = basePrice * PLATFORM_RATES.COMMISSION_PERCENT;
  const ownerReceives = basePrice - platformCommission;
  
  return {
    basePrice,
    serviceFee,
    insurance,
    securityDeposit,
    totalRenterPays,
    platformCommission,
    ownerReceives,
    dailyRate,
    numberOfDays,
  };
}

/**
 * Format pricing for display
 */
export function formatPricingBreakdown(pricing: PricingCalculation): string {
  return `
Base Price: $${pricing.basePrice.toFixed(2)} (${pricing.numberOfDays} days × $${pricing.dailyRate.toFixed(2)})
Service Fee: $${pricing.serviceFee.toFixed(2)} (15%)
${pricing.insurance > 0 ? `Insurance: $${pricing.insurance.toFixed(2)} (10% daily)\n` : ''}${pricing.securityDeposit > 0 ? `Security Deposit: $${pricing.securityDeposit.toFixed(2)}\n` : ''}
TOTAL: $${pricing.totalRenterPays.toFixed(2)}

Owner Receives: $${pricing.ownerReceives.toFixed(2)} (after 20% commission)
  `.trim();
}

/**
 * Convert user points to credit value
 */
export function pointsToCredit(points: number): number {
  return points * PLATFORM_RATES.POINTS_TO_CREDIT_RATE;
}

/**
 * Convert credit amount to required points
 */
export function creditToPoints(creditAmount: number): number {
  return Math.ceil(creditAmount / PLATFORM_RATES.POINTS_TO_CREDIT_RATE);
} 