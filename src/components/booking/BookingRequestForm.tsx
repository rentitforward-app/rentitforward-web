'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PricingBreakdown } from './PricingBreakdown';
import { formatPrice } from '@/lib/pricing-constants';
import { DateRangeSelection } from '@/lib/calendar-utils';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  User,
  Star
} from 'lucide-react';

interface BookingRequestFormProps {
  listingId: string;
  listingTitle: string;
  ownerName: string;
  ownerRating?: number;
  dailyRate: number;
  securityDeposit: number;
  dateSelection: DateRangeSelection;
  userPointsBalance: number;
  onSuccess: (bookingId: string) => void;
}

interface BookingFormData {
  includeInsurance: boolean;
  pointsToUse: number;
  notes: string;
  agreeToTerms: boolean;
  paymentMethodId?: string;
}

export function BookingRequestForm({
  listingId,
  listingTitle,
  ownerName,
  ownerRating,
  dailyRate,
  securityDeposit,
  dateSelection,
  userPointsBalance,
  onSuccess,
}: BookingRequestFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<BookingFormData>({
    includeInsurance: false,
    pointsToUse: 0,
    notes: '',
    agreeToTerms: false,
  });

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate pricing
  const rentalFee = dailyRate * dateSelection.duration;
  const serviceFee = rentalFee * 0.15; // 15%
  const insuranceFee = formData.includeInsurance ? rentalFee * 0.10 : 0; // 10%
  const creditApplied = formData.pointsToUse * 0.10; // 100 points = $10
  const subtotal = rentalFee + serviceFee + insuranceFee + securityDeposit;
  const totalAmount = Math.max(0, subtotal - creditApplied);

  // Booking authorization mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await fetch('/api/bookings/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          startDate: dateSelection.startDate?.toISOString().split('T')[0],
          endDate: dateSelection.endDate?.toISOString().split('T')[0],
          dailyRate,
          duration: dateSelection.duration,
          includeInsurance: data.includeInsurance,
          securityDeposit,
          pointsToUse: data.pointsToUse,
          notes: data.notes,
          paymentMethodId: data.paymentMethodId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking request');
      }

      return response.json();
    },
    onSuccess: (data) => {
      onSuccess(data.booking.id);
    },
  });

  const handleInputChange = (field: keyof BookingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!dateSelection.startDate || !dateSelection.endDate) {
      newErrors.dates = 'Please select valid dates';
    }

    if (formData.pointsToUse > userPointsBalance) {
      newErrors.points = 'Cannot use more points than available';
    }

    if (formData.pointsToUse < 0) {
      newErrors.points = 'Points must be 0 or greater';
    }

    if (!formData.agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    if (formData.notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await createBookingMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Booking request failed:', error);
    }
  };

  if (!dateSelection.startDate || !dateSelection.endDate) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Please select your check-in and check-out dates to continue with your booking.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Owner Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Host</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <div className="font-medium">{ownerName}</div>
              {ownerRating && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>{ownerRating.toFixed(1)} rating</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">{listingTitle}</h3>
            <div className="text-sm text-gray-600">
              {dateSelection.startDate?.toLocaleDateString()} - {dateSelection.endDate?.toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">
              {dateSelection.duration} day{dateSelection.duration !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <PricingBreakdown
            dailyRate={dailyRate}
            duration={dateSelection.duration}
            includeInsurance={formData.includeInsurance}
            securityDeposit={securityDeposit}
            pointsUsed={formData.pointsToUse}
            userPointsBalance={userPointsBalance}
            onInsuranceToggle={(include) => handleInputChange('includeInsurance', include)}
            onPointsChange={(points) => handleInputChange('pointsToUse', points)}
          />
        </CardContent>
      </Card>

      {/* Booking Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Damage Protection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <Label htmlFor="insurance" className="font-medium">
                    Damage Protection
                  </Label>
                </div>
                <Switch
                  id="insurance"
                  checked={formData.includeInsurance}
                  onCheckedChange={(checked) => handleInputChange('includeInsurance', checked)}
                />
              </div>
              
              <div className="text-sm text-gray-600 ml-7">
                {formData.includeInsurance ? (
                  <div className="text-green-600">
                    ✓ Covered for accidental damage up to the item's full value ({formatPrice(insuranceFee)})
                  </div>
                ) : (
                  <div>
                    Optional coverage for accidental damage ({formatPrice(rentalFee * 0.10)})
                  </div>
                )}
              </div>
            </div>

            {/* Points Usage */}
            <div className="space-y-3">
              <Label htmlFor="points" className="font-medium">
                Use Points Credit ({userPointsBalance} points available)
              </Label>
              
              <div className="flex items-center gap-4">
                <input
                  id="points"
                  type="number"
                  min="0"
                  max={userPointsBalance}
                  value={formData.pointsToUse}
                  onChange={(e) => handleInputChange('pointsToUse', parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border rounded-lg text-sm"
                />
                <span className="text-sm text-gray-600">
                  points = {formatPrice(formData.pointsToUse * 0.10)} credit
                </span>
                
                {userPointsBalance > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('pointsToUse', userPointsBalance)}
                  >
                    Use all
                  </Button>
                )}
              </div>
              
              {errors.points && (
                <div className="text-red-500 text-sm">{errors.points}</div>
              )}
            </div>

            {/* Special Requests */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="font-medium">
                Special Requests or Notes (Optional)
              </Label>
              
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="e.g., Preferred pickup time, special handling instructions..."
                className="w-full p-3 border rounded-lg text-sm"
                rows={3}
                maxLength={500}
              />
              
              <div className="text-xs text-gray-500">
                {formData.notes.length}/500 characters
              </div>
              
              {errors.notes && (
                <div className="text-red-500 text-sm">{errors.notes}</div>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed">
                  I agree to the{' '}
                  <a href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/cancellation-policy" className="text-blue-600 hover:underline">
                    Cancellation Policy
                  </a>
                </Label>
              </div>
              
              {errors.terms && (
                <div className="text-red-500 text-sm">{errors.terms}</div>
              )}
            </div>

            {/* Approval Process Info */}
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Steps:</strong> Your payment will be authorized (not charged) and the owner 
                will have 48 hours to approve your request. You'll only be charged if they approve.
              </AlertDescription>
            </Alert>

            {/* Error Display */}
            {createBookingMutation.error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {createBookingMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={createBookingMutation.isPending || !formData.agreeToTerms}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {createBookingMutation.isPending ? (
                  'Creating Request...'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Request to Book • {formatPrice(totalAmount)}
                  </>
                )}
              </Button>
              
              <div className="text-xs text-gray-500 text-center">
                Your payment method will be authorized but not charged until the owner approves your request.
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}