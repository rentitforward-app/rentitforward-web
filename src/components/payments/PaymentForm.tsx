'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  bookingDetails?: {
    listing_title: string;
    total_amount: number;
    service_fee: number;
    deposit_amount: number;
  };
  stripeAccountId?: string;
}

const PaymentFormContent = ({ 
  clientSecret, 
  amount, 
  onSuccess, 
  onError,
  bookingDetails,
  stripeAccountId 
}: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setMessage('');

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setMessage('Card element not found');
      setProcessing(false);
      return;
    }

    // Confirm payment
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    setProcessing(false);

    if (error) {
      console.error('Payment failed:', error);
      setMessage(error.message || 'Payment failed');
      onError(error.message || 'Payment failed');
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      console.log('Payment succeeded:', paymentIntent);
      setMessage('Payment successful!');
      onSuccess(paymentIntent);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Complete Payment
        </h3>
        
        {bookingDetails && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Booking Summary</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Item:</span>
                <span className="font-medium">{bookingDetails.listing_title}</span>
              </div>
              <div className="flex justify-between">
                <span>Rental Amount:</span>
                <span>${(bookingDetails.total_amount - bookingDetails.service_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee:</span>
                <span>${bookingDetails.service_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Deposit:</span>
                <span>${bookingDetails.deposit_amount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-1 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${(bookingDetails.total_amount + bookingDetails.deposit_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#374151',
                    '::placeholder': {
                      color: '#9CA3AF',
                    },
                  },
                  invalid: {
                    color: '#EF4444',
                  },
                },
              }}
            />
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm ${
              message.includes('successful') 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <Button
            type="submit"
            disabled={!stripe || processing}
            className="w-full"
          >
            {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
          </Button>
        </form>

        <div className="mt-4 text-xs text-gray-500">
          <p>🔒 Your payment information is secure and encrypted.</p>
          {stripeAccountId && (
            <p className="mt-1">
              Payment will be processed through Stripe Connect.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const PaymentForm = (props: PaymentFormProps) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};

export default PaymentForm; 