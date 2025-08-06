/**
 * Pricing constants for the application
 * Updated January 2025 for new UX flow
 */

export const PRICING_CONSTANTS = {
  // Updated fees (January 2025 pricing structure)
  SERVICE_FEE_PERCENTAGE: 0.15, // 15% (added to renter's payment)
  PLATFORM_COMMISSION_PERCENTAGE: 0.20, // 20% (deducted from owner's payout)
  INSURANCE_PERCENTAGE: 0.10, // 10% of daily rate (optional)
  PAYMENT_PROCESSING_FEE: 0.029, // 2.9%
  GST_RATE: 0.1, // 10%

  // Points system
  POINTS_TO_DOLLAR_RATE: 0.10, // 100 points = $10 AUD
  
  // Currency
  DEFAULT_CURRENCY: 'AUD',
  
  // Booking limits
  MIN_BOOKING_DURATION: 1, // days
  MAX_BOOKING_DURATION: 365, // days
  MAX_ADVANCE_BOOKING: 365, // days in advance
} as const;

/**
 * Format price as AUD currency
 */
export function formatPrice(amount: number, currency: string = PRICING_CONSTANTS.DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount);
}