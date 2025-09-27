'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Info, DollarSign } from 'lucide-react';
import { formatPrice, PRICING_CONSTANTS } from '@/lib/pricing-constants';

interface PricingBreakdownProps {
  basePrice: number; // Daily rate
  duration: number; // Number of days
  hasWeeklyRate?: boolean;
  weeklyRate?: number;
  hasInsurance?: boolean;
  onInsuranceChange?: (enabled: boolean) => void;
  securityDeposit?: number;
  deliveryMethod?: 'pickup' | 'delivery';
  deliveryMethodRegister?: any;
  deliveryAddressRegister?: any;
  deliveryMethodError?: any;
  showDeliveryAddress?: boolean;
  notesRegister?: any;
  pointsBalance?: number;
  pointsApplied?: number;
  onPointsAppliedChange?: (points: number) => void;
  className?: string;
  showOwnerEarnings?: boolean;
}

interface PricingCalculation {
  baseAmount: number;
  serviceFee: number;
  insuranceFee: number;
  deliveryFee: number;
  securityDeposit: number;
  pointsDiscount: number;
  totalRenterPays: number;
  ownerEarns: number;
  platformCommission: number;
}

export function PricingBreakdown({
  basePrice,
  duration,
  hasWeeklyRate = false,
  weeklyRate,
  hasInsurance = false,
  onInsuranceChange,
  securityDeposit = 0,
  deliveryMethod = 'pickup',
  deliveryMethodRegister,
  deliveryAddressRegister,
  deliveryMethodError,
  showDeliveryAddress = false,
  notesRegister,
  pointsBalance = 0,
  pointsApplied = 0,
  onPointsAppliedChange,
  className,
  showOwnerEarnings = false
}: PricingBreakdownProps) {
  
  // Calculate pricing breakdown
  const pricing = useMemo((): PricingCalculation => {
    // Calculate base amount (use weekly rate if applicable and duration >= 7 days)
    let baseAmount: number;
    if (hasWeeklyRate && weeklyRate && duration >= 7) {
      const weeks = Math.floor(duration / 7);
      const remainingDays = duration % 7;
      baseAmount = (weeks * weeklyRate) + (remainingDays * basePrice);
    } else {
      baseAmount = basePrice * duration;
    }

    // Calculate fees based on updated pricing structure
    const serviceFee = baseAmount * PRICING_CONSTANTS.SERVICE_FEE_PERCENTAGE; // 15%
    const platformCommission = baseAmount * PRICING_CONSTANTS.PLATFORM_COMMISSION_PERCENTAGE; // 20%
    const insuranceFee = hasInsurance ? baseAmount * PRICING_CONSTANTS.INSURANCE_PERCENTAGE : 0; // 10%
    const deliveryFee = deliveryMethod === 'delivery' ? 20.00 : 0; // $20 delivery fee
    
    // Calculate points discount
    const pointsDiscount = pointsApplied * PRICING_CONSTANTS.POINTS_TO_DOLLAR_RATE;
    
    // Calculate totals
    const totalRenterPays = baseAmount + serviceFee + insuranceFee + deliveryFee + securityDeposit - pointsDiscount;
    const ownerEarns = baseAmount - platformCommission;

    return {
      baseAmount,
      serviceFee,
      insuranceFee,
      deliveryFee,
      securityDeposit,
      pointsDiscount,
      totalRenterPays,
      ownerEarns,
      platformCommission,
    };
  }, [basePrice, weeklyRate, duration, hasWeeklyRate, hasInsurance, deliveryMethod, securityDeposit, pointsApplied]);

  const handleInsuranceToggle = (enabled: boolean) => {
    onInsuranceChange?.(enabled);
  };

  const maxPointsToApply = Math.min(
    pointsBalance,
    Math.floor(pricing.baseAmount * 0.5 / PRICING_CONSTANTS.POINTS_TO_DOLLAR_RATE) // Max 50% of base amount
  );

  const handlePointsChange = (points: number) => {
    const validPoints = Math.max(0, Math.min(points, maxPointsToApply));
    onPointsAppliedChange?.(validPoints);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Booking Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No dates selected message */}
        {duration === 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              Select dates to see pricing details
            </p>
          </div>
        )}
        
        {/* Base Rental Cost */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Rental fee</span>
            <span className="font-medium">
              {duration > 0 ? formatPrice(pricing.baseAmount) : formatPrice(0)}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {duration > 0 ? (
              hasWeeklyRate && weeklyRate && duration >= 7 ? (
                <>
                  {Math.floor(duration / 7)} week{Math.floor(duration / 7) !== 1 ? 's' : ''} × {formatPrice(weeklyRate)}
                  {duration % 7 > 0 && (
                    <> + {duration % 7} day{duration % 7 !== 1 ? 's' : ''} × {formatPrice(basePrice)}</>
                  )}
                </>
              ) : (
                <>{duration} day{duration !== 1 ? 's' : ''} × {formatPrice(basePrice)}</>
              )
            ) : (
              <>0 days × {formatPrice(basePrice)}</>
            )}
          </div>
        </div>

        {/* Service Fee */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm">Service fee</span>
            <span className="font-medium">
              {duration > 0 ? formatPrice(pricing.serviceFee) : formatPrice(0)}
            </span>
          </div>
          <div className="flex justify-end">
            <Badge variant="outline" className="text-xs">
              {(PRICING_CONSTANTS.SERVICE_FEE_PERCENTAGE * 100).toFixed(0)}% of rental fee
            </Badge>
          </div>
        </div>

        {/* Insurance Option */}
        {onInsuranceChange && (
          <div className="space-y-3">
            <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              hasInsurance 
                ? 'border-[#44D62C] bg-green-50 shadow-sm' 
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="insurance"
                    checked={hasInsurance}
                    onCheckedChange={handleInsuranceToggle}
                    className="h-7 w-12 data-[state=checked]:bg-[#44D62C] data-[state=unchecked]:bg-gray-300"
                    style={{
                      backgroundColor: hasInsurance ? '#44D62C' : '#d1d5db'
                    }}
                  />
                  <style jsx>{`
                    #insurance[data-state="checked"] {
                      background-color: #44D62C !important;
                    }
                    #insurance[data-state="unchecked"] {
                      background-color: #d1d5db !important;
                    }
                    #insurance[data-state="checked"] .react-switch-handle {
                      background-color: white !important;
                      border: 2px solid #44D62C !important;
                    }
                    #insurance[data-state="unchecked"] .react-switch-handle {
                      background-color: white !important;
                      border: 2px solid #d1d5db !important;
                    }
                  `}</style>
                  <Label htmlFor="insurance" className={`text-sm font-medium cursor-pointer ${
                    hasInsurance ? 'text-green-800' : 'text-gray-700'
                  }`}>
                    Damage protection
                  </Label>
                  {hasInsurance && (
                    <Badge className="bg-[#44D62C] hover:bg-[#3AB827] text-white text-xs font-semibold px-2 py-1">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Protection fee</span>
                  <span className={`font-medium ${hasInsurance ? 'text-green-700' : 'text-gray-500'}`}>
                    {hasInsurance && duration > 0 ? formatPrice(pricing.insuranceFee) : formatPrice(0)}
                  </span>
                </div>
                <div className="flex justify-start">
                  <Badge variant="outline" className="text-xs">
                    {(PRICING_CONSTANTS.INSURANCE_PERCENTAGE * 100).toFixed(0)}% of rental fee
                  </Badge>
                </div>
              </div>
            </div>
            {hasInsurance && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">
                  Covers accidental damage or loss up to the item's full value. 
                  Security deposit may still apply.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Delivery Fee */}
        {deliveryMethod === 'delivery' && (
          <div className="flex justify-between items-center">
            <span className="text-sm">Delivery fee</span>
            <span className="font-medium">{formatPrice(pricing.deliveryFee)}</span>
          </div>
        )}

        {/* Security Deposit */}
        {securityDeposit > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <span className="text-sm">Security deposit</span>
              <Badge variant="secondary" className="text-xs">Refundable</Badge>
            </div>
            <span className="font-medium">{formatPrice(securityDeposit)}</span>
          </div>
        )}

        {/* Points/Credits */}
        {pointsBalance > 0 && onPointsAppliedChange && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Credits applied</span>
              <span className="font-medium text-green-600">
                -{formatPrice(pricing.pointsDiscount)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {pointsApplied} points used ({pointsBalance - pointsApplied} remaining)
            </div>
            {maxPointsToApply > pointsApplied && (
              <button
                onClick={() => handlePointsChange(maxPointsToApply)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Use maximum credits ({maxPointsToApply} points = {formatPrice(maxPointsToApply * PRICING_CONSTANTS.POINTS_TO_DOLLAR_RATE)})
              </button>
            )}
          </div>
        )}

        {/* Delivery Method Section */}
        {deliveryMethodRegister && (
          <div className="space-y-4">
            <Separator />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pickup"
                    {...deliveryMethodRegister}
                    className="mr-2"
                  />
                  Pickup
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="delivery"
                    {...deliveryMethodRegister}
                    className="mr-2"
                  />
                  Delivery (+$20)
                </label>
              </div>
              {deliveryMethodError && (
                <p className="text-red-500 text-sm mt-1">{deliveryMethodError.message}</p>
              )}
            </div>
            
            {showDeliveryAddress && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Address
                </label>
                <textarea
                  {...deliveryAddressRegister}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Enter delivery address..."
                />
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(Math.max(0, pricing.totalRenterPays))}</span>
        </div>

        {/* Notes Section */}
        {notesRegister && (
          <>
            <Separator />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes for Host (Optional)
              </label>
              <textarea
                {...notesRegister}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Any special requests or information..."
              />
            </div>
          </>
        )}

        {/* Owner Earnings (if requested) */}
        {showOwnerEarnings && (
          <>
            <Separator />
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900">Owner earnings</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Rental amount</span>
                  <span>{formatPrice(pricing.baseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform commission (-{(PRICING_CONSTANTS.PLATFORM_COMMISSION_PERCENTAGE * 100).toFixed(0)}%)</span>
                  <span>-{formatPrice(pricing.platformCommission)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-900">
                  <span>You earn</span>
                  <span>{formatPrice(pricing.ownerEarns)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pricing Notes */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Service fee helps us run a safe and reliable platform</p>
          {hasInsurance && <p>• Insurance fee provides damage protection coverage</p>}
          {deliveryMethod === 'delivery' && <p>• Delivery fee covers transportation to your location</p>}
          {securityDeposit > 0 && <p>• Security deposit is refunded after item return in good condition</p>}
          <p>• All prices are in AUD and include GST where applicable</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PricingBreakdown;