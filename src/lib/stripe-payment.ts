import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface PaymentIntentData {
  clientSecret: string;
  amount: number;
  currency: string;
  bookingId: string;
}

export interface BookingPayment {
  bookingId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

/**
 * Create a payment intent for a booking
 */
export async function createBookingPaymentIntent(
  booking: BookingPayment
): Promise<PaymentIntentData> {
  const response = await fetch('/api/payments/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookingId: booking.bookingId,
      amount: booking.amount,
      currency: booking.currency,
      metadata: booking.metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment intent');
  }

  return response.json();
}

/**
 * Confirm payment and complete booking
 */
export async function confirmBookingPayment(
  clientSecret: string,
  paymentMethod: any
) {
  const stripe = await stripePromise;
  
  if (!stripe) {
    throw new Error('Stripe not loaded');
  }

  const result = await stripe.confirmPayment({
    clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/bookings`,
    },
    redirect: 'if_required',
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

/**
 * Get Stripe instance
 */
export async function getStripe() {
  return stripePromise;
}