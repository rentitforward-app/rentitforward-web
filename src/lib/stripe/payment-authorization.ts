/**
 * Stripe Payment Authorization for Owner Approval Workflow
 * 
 * Flow: Authorize → Owner Approval → Capture (or Void if rejected)
 */

import Stripe from 'stripe';
import { formatPrice, PRICING_CONSTANTS } from '@/lib/pricing-constants';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export interface PaymentAuthorizationData {
  listingId: string;
  bookingId: string;
  rentalFee: number;
  serviceFee: number;
  insuranceFee: number;
  securityDeposit: number;
  totalAmount: number;
  duration: number; // days
  startDate: string;
  endDate: string;
  pointsUsed: number;
  creditApplied: number;
}

export interface AuthorizationResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
  authorizedAmount?: number;
}

export interface CaptureResult {
  success: boolean;
  chargeId?: string;
  capturedAmount?: number;
  error?: string;
}

/**
 * Step 1: Create payment intent and authorize funds (don't capture yet)
 */
export async function authorizePayment(
  customerId: string,
  authData: PaymentAuthorizationData,
  paymentMethodId?: string
): Promise<AuthorizationResult> {
  try {
    const metadata = {
      booking_id: authData.bookingId,
      listing_id: authData.listingId,
      rental_fee: authData.rentalFee.toString(),
      service_fee: authData.serviceFee.toString(),
      insurance_fee: authData.insuranceFee.toString(),
      security_deposit: authData.securityDeposit.toString(),
      points_used: authData.pointsUsed.toString(),
      credit_applied: authData.creditApplied.toString(),
      duration: authData.duration.toString(),
      start_date: authData.startDate,
      end_date: authData.endDate,
      workflow_step: 'authorization',
    };

    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(authData.totalAmount * 100), // Convert to cents
      currency: 'aud',
      customer: customerId,
      metadata,
      description: `Rental booking authorization - ${authData.duration} days`,
      capture_method: 'manual', // Critical: Manual capture for owner approval
      confirmation_method: 'automatic',
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // If payment method provided, attach it
    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
      paymentIntentData.confirm = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      authorizedAmount: authData.totalAmount,
    };
  } catch (error) {
    console.error('Payment authorization failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authorization failed',
    };
  }
}

/**
 * Step 2: Capture payment after owner approval
 */
export async function captureAuthorizedPayment(
  paymentIntentId: string,
  captureAmount?: number
): Promise<CaptureResult> {
  try {
    // Get payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'requires_capture') {
      return {
        success: false,
        error: `Payment intent status is ${paymentIntent.status}, expected requires_capture`,
      };
    }

    // Capture the payment
    const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: captureAmount ? Math.round(captureAmount * 100) : undefined,
    });

    return {
      success: true,
      chargeId: capturedIntent.latest_charge as string,
      capturedAmount: (capturedIntent.amount_received || 0) / 100,
    };
  } catch (error) {
    console.error('Payment capture failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Capture failed',
    };
  }
}

/**
 * Step 3: Void/cancel payment if owner rejects
 */
export async function voidAuthorizedPayment(
  paymentIntentId: string,
  reason: string = 'Owner rejected booking'
): Promise<{ success: boolean; error?: string }> {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: 'requested_by_customer',
    });

    return { success: true };
  } catch (error) {
    console.error('Payment void failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Void failed',
    };
  }
}

/**
 * Get payment intent status and details
 */
export async function getPaymentStatus(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      success: true,
      status: paymentIntent.status,
      amount: (paymentIntent.amount || 0) / 100,
      capturedAmount: (paymentIntent.amount_received || 0) / 100,
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    console.error('Failed to get payment status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    };
  }
}

/**
 * Calculate owner payout amount (after platform commission)
 */
export function calculateOwnerPayout(rentalFee: number): number {
  const commission = rentalFee * PRICING_CONSTANTS.PLATFORM_COMMISSION_PERCENTAGE;
  return rentalFee - commission;
}

/**
 * Generate payment breakdown for display
 */
export function generatePaymentBreakdown(authData: PaymentAuthorizationData) {
  const ownerPayout = calculateOwnerPayout(authData.rentalFee);
  const platformRevenue = authData.serviceFee + (authData.rentalFee * PRICING_CONSTANTS.PLATFORM_COMMISSION_PERCENTAGE);

  return {
    renterPayment: {
      rentalFee: authData.rentalFee,
      serviceFee: authData.serviceFee,
      insurance: authData.insuranceFee,
      securityDeposit: authData.securityDeposit,
      creditApplied: -authData.creditApplied,
      total: authData.totalAmount,
    },
    ownerPayout: {
      grossRevenue: authData.rentalFee,
      platformCommission: authData.rentalFee * PRICING_CONSTANTS.PLATFORM_COMMISSION_PERCENTAGE,
      netPayout: ownerPayout,
    },
    platformRevenue: {
      serviceFee: authData.serviceFee,
      commission: authData.rentalFee * PRICING_CONSTANTS.PLATFORM_COMMISSION_PERCENTAGE,
      total: platformRevenue,
    },
    insurance: {
      fee: authData.insuranceFee,
      coverage: authData.rentalFee, // Insurance covers full rental value
    },
  };
}

/**
 * Create Stripe customer if not exists
 */
export async function ensureStripeCustomer(
  userId: string,
  email: string,
  name: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return {
        success: true,
        customerId: existingCustomers.data[0].id,
      };
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        user_id: userId,
      },
    });

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error) {
    console.error('Failed to ensure Stripe customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Customer creation failed',
    };
  }
}