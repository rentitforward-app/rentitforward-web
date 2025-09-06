'use client';

import { formatCurrency } from '@/lib/payment-calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Shield, Star, CreditCard, Receipt } from 'lucide-react';

interface PaymentBreakdown {
  id: string;
  booking_id: string;
  base_price_per_day: number;
  total_days: number;
  subtotal: number;
  renter_service_fee_rate: number;
  renter_service_fee_amount: number;
  insurance_fee: number;
  delivery_fee: number;
  security_deposit: number;
  renter_total_amount: number;
  owner_commission_rate: number;
  owner_commission_amount: number;
  owner_net_earnings: number;
  platform_total_revenue: number;
  points_earned: number;
  points_redeemed: number;
  points_credit_applied: number;
  currency: string;
  created_at: string;
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  delivery_method: string;
  delivery_address?: string;
  pickup_address?: string;
  special_instructions?: string;
  created_at: string;
  listings: {
    title: string;
    images: string[];
    category: string;
  };
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
  owner_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

interface PaymentReceiptProps {
  booking: Booking;
  paymentBreakdown: PaymentBreakdown;
  viewType: 'renter' | 'owner' | 'admin';
  showFullDetails?: boolean;
}

export function PaymentReceipt({ 
  booking, 
  paymentBreakdown, 
  viewType, 
  showFullDetails = false 
}: PaymentReceiptProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Receipt Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-xl">Payment Receipt</CardTitle>
                <p className="text-sm text-gray-600">Booking #{booking.id.slice(0, 8)}</p>
              </div>
            </div>
            <Badge className={getStatusColor(booking.status)}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booking Details */}
            <div>
              <h3 className="font-semibold mb-3">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{booking.delivery_method === 'pickup' ? 'Pickup' : 'Delivery'}</span>
                </div>
                {booking.delivery_address && (
                  <p className="text-gray-600 ml-6">{booking.delivery_address}</p>
                )}
                {booking.pickup_address && (
                  <p className="text-gray-600 ml-6">{booking.pickup_address}</p>
                )}
              </div>
            </div>

            {/* Item Details */}
            <div>
              <h3 className="font-semibold mb-3">Item Details</h3>
              <div className="flex items-start space-x-3">
                {booking.listings.images[0] && (
                  <img 
                    src={booking.listings.images[0]} 
                    alt={booking.listings.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h4 className="font-medium">{booking.listings.title}</h4>
                  <p className="text-sm text-gray-600">{booking.listings.category}</p>
                  <p className="text-sm text-gray-600">
                    Owner: {viewType === 'renter' ? booking.owner_profile.full_name : booking.profiles.full_name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>
              {viewType === 'renter' && 'Payment Summary'}
              {viewType === 'owner' && 'Earnings Summary'}
              {viewType === 'admin' && 'Payment Breakdown'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Base Pricing */}
            <div className="flex justify-between items-center">
              <span>Base Price ({paymentBreakdown.total_days} days × {formatCurrency(paymentBreakdown.base_price_per_day)})</span>
              <span className="font-medium">{formatCurrency(paymentBreakdown.subtotal)}</span>
            </div>

            {/* Renter View */}
            {viewType === 'renter' && (
              <>
                <div className="flex justify-between items-center">
                  <span>Service Fee ({(paymentBreakdown.renter_service_fee_rate * 100).toFixed(0)}%)</span>
                  <span className="font-medium">{formatCurrency(paymentBreakdown.renter_service_fee_amount)}</span>
                </div>

                {paymentBreakdown.insurance_fee > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span>Insurance Protection</span>
                    </div>
                    <span className="font-medium">{formatCurrency(paymentBreakdown.insurance_fee)}</span>
                  </div>
                )}

                {paymentBreakdown.delivery_fee > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <span>Delivery Fee</span>
                    </div>
                    <span className="font-medium">{formatCurrency(paymentBreakdown.delivery_fee)}</span>
                  </div>
                )}

                {paymentBreakdown.security_deposit > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Security Deposit (Refundable)</span>
                    <span className="font-medium">{formatCurrency(paymentBreakdown.security_deposit)}</span>
                  </div>
                )}

                {paymentBreakdown.points_credit_applied > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4" />
                      <span>Points Credit Applied ({paymentBreakdown.points_redeemed} points)</span>
                    </div>
                    <span className="font-medium">-{formatCurrency(paymentBreakdown.points_credit_applied)}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Paid</span>
                  <span>{formatCurrency(paymentBreakdown.renter_total_amount)}</span>
                </div>

                {paymentBreakdown.points_earned > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-700">
                      <Star className="h-4 w-4" />
                      <span className="font-medium">Points Earned: {paymentBreakdown.points_earned} points (${(paymentBreakdown.points_earned / 10).toFixed(2)} credit)</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Owner View */}
            {viewType === 'owner' && (
              <>
                <div className="flex justify-between items-center text-red-600">
                  <span>Platform Commission ({(paymentBreakdown.owner_commission_rate * 100).toFixed(0)}%)</span>
                  <span className="font-medium">-{formatCurrency(paymentBreakdown.owner_commission_amount)}</span>
                </div>

                <Separator />
                <div className="flex justify-between items-center text-lg font-bold text-green-600">
                  <span>Your Earnings</span>
                  <span>{formatCurrency(paymentBreakdown.owner_net_earnings)}</span>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Earnings will be transferred to your connected Stripe account after the rental is completed.
                  </p>
                </div>
              </>
            )}

            {/* Admin View */}
            {viewType === 'admin' && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Renter Side */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-blue-600">Renter Charges</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Service Fee ({(paymentBreakdown.renter_service_fee_rate * 100).toFixed(0)}%)</span>
                        <span>{formatCurrency(paymentBreakdown.renter_service_fee_amount)}</span>
                      </div>
                      {paymentBreakdown.insurance_fee > 0 && (
                        <div className="flex justify-between">
                          <span>Insurance</span>
                          <span>{formatCurrency(paymentBreakdown.insurance_fee)}</span>
                        </div>
                      )}
                      {paymentBreakdown.delivery_fee > 0 && (
                        <div className="flex justify-between">
                          <span>Delivery</span>
                          <span>{formatCurrency(paymentBreakdown.delivery_fee)}</span>
                        </div>
                      )}
                      {paymentBreakdown.security_deposit > 0 && (
                        <div className="flex justify-between">
                          <span>Deposit</span>
                          <span>{formatCurrency(paymentBreakdown.security_deposit)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Paid</span>
                        <span>{formatCurrency(paymentBreakdown.renter_total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Owner Side */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-600">Owner Earnings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Commission ({(paymentBreakdown.owner_commission_rate * 100).toFixed(0)}%)</span>
                        <span className="text-red-600">-{formatCurrency(paymentBreakdown.owner_commission_amount)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Net Earnings</span>
                        <span className="text-green-600">{formatCurrency(paymentBreakdown.owner_net_earnings)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Platform Revenue</span>
                    <span className="text-green-600">{formatCurrency(paymentBreakdown.platform_total_revenue)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Service Fee + Commission: {formatCurrency(paymentBreakdown.renter_service_fee_amount)} + {formatCurrency(paymentBreakdown.owner_commission_amount)}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Details for Admin */}
      {viewType === 'admin' && showFullDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Calculation Version:</span>
                <span className="ml-2">{paymentBreakdown.calculation_version}</span>
              </div>
              <div>
                <span className="font-medium">Currency:</span>
                <span className="ml-2">{paymentBreakdown.currency}</span>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2">{formatDate(paymentBreakdown.created_at)}</span>
              </div>
              <div>
                <span className="font-medium">Booking ID:</span>
                <span className="ml-2 font-mono text-xs">{booking.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
