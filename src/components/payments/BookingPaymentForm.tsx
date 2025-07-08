'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  CreditCard, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  Lock,
  Calculator,
  Calendar,
  DollarSign,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from 'rentitforward-shared/src/utils/formatting';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BookingDetails {
  listing_id: string;
  listing_title: string;
  listing_image?: string;
  daily_rate: number;
  start_date: string;
  end_date: string;
  total_days: number;
  has_insurance: boolean;
  insurance_cost: number;
  has_deposit: boolean;
  deposit_amount: number;
  platform_fee: number;
  subtotal: number;
  total: number;
}

interface BookingPaymentFormProps {
  booking: BookingDetails;
  onSuccess: (bookingId: string, paymentIntentId: string) => void;
  onCancel: () => void;
  className?: string;
}

interface PaymentFormProps {
  booking: BookingDetails;
  onSuccess: (bookingId: string, paymentIntentId: string) => void;
  onCancel: () => void;
}

// Payment form component (needs to be inside Elements provider)
const PaymentForm: React.FC<PaymentFormProps> = ({ booking, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_booking_payment',
            booking_details: booking,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setClientSecret(data.client_secret);
        } else {
          setError(data.error || 'Failed to initialize payment');
        }
      } catch (err) {
        setError('Failed to initialize payment');
      }
    };

    createPaymentIntent();
  }, [booking]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setProcessing(false);
      return;
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Add user billing details here if available
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        toast.error(stripeError.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast.success('Payment successful! Your booking is confirmed.');
        onSuccess(booking.listing_id, paymentIntent.id);
      }
    } catch (err) {
      setError('Payment processing failed');
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        iconColor: '#424770',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium">{booking.listing_title}</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{booking.total_days} days × {formatCurrency(booking.daily_rate)}</span>
              <span>{formatCurrency(booking.subtotal)}</span>
            </div>
            
            {booking.has_insurance && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Insurance Protection
                </span>
                <span>{formatCurrency(booking.insurance_cost)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span>{formatCurrency(booking.platform_fee)}</span>
            </div>
            
            {booking.has_deposit && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  Security Deposit
                  <Badge variant="outline" size="sm">Refundable</Badge>
                </span>
                <span>{formatCurrency(booking.deposit_amount)}</span>
              </div>
            )}
            
            <hr className="my-2" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(booking.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 border rounded-lg">
            <CardElement options={cardElementOptions} />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Secure Payment Processing</p>
                <p>Your payment is processed securely by Stripe. Funds are held in escrow until the rental is completed.</p>
                {booking.has_deposit && (
                  <p className="mt-1">Your security deposit will be refunded within 5-7 business days after the item is returned in good condition.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          disabled={!stripe || processing || !clientSecret}
          className="flex-1"
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Pay {formatCurrency(booking.total)}
            </div>
          )}
        </Button>
      </div>
    </form>
  );
};

// Main component
export const BookingPaymentForm: React.FC<BookingPaymentFormProps> = ({
  booking,
  onSuccess,
  onCancel,
  className,
}) => {
  const [stripeLoading, setStripeLoading] = useState(true);

  const elementsOptions: StripeElementsOptions = {
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  useEffect(() => {
    stripePromise.then(() => setStripeLoading(false));
  }, []);

  if (stripeLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <span>Loading payment form...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentForm
          booking={booking}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
};

export default BookingPaymentForm; 