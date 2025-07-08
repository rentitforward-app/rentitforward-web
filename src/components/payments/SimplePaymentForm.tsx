'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreditCard, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
// Local currency formatting helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount / 100); // Convert cents to dollars
};

interface SimplePaymentFormProps {
  amount: number;
  description: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  className?: string;
}

export const SimplePaymentForm: React.FC<SimplePaymentFormProps> = ({
  amount,
  description,
  onSuccess,
  onCancel,
  className,
}) => {
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcessing(true);

    try {
      const response = await fetch('/api/payments/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_simple_payment',
          amount,
          description,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Payment processed successfully!');
        onSuccess(data.payment_intent_id);
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch (error) {
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">{formatCurrency(amount)}</p>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing} className="flex-1">
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Pay {formatCurrency(amount)}
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SimplePaymentForm; 