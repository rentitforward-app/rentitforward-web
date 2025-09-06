'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  CheckCircle, 
  Calendar, 
  Home, 
  Loader2, 
  ArrowLeft, 
  MessageCircle,
  Receipt,
  CreditCard,
  MapPin,
  Shield,
  Clock,
  User,
  Download,
  Mail,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface PaymentBreakdown {
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
  calculation_version: string;
}

interface Booking {
  id: string;
  total_amount: number;
  subtotal: number;
  service_fee: number;
  delivery_fee: number;
  deposit_amount: number;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  delivery_method: string;
  delivery_address?: string;
  pickup_address?: string;
  special_instructions?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  listings: {
    title: string;
    images: string[];
    owner_id: string;
    category: string;
    price_per_day: number;
  };
  renter_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  owner_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface PaymentBreakdownResponse {
  booking: Booking;
  payment_breakdown: PaymentBreakdown | null;
  view_type: 'renter' | 'owner' | 'admin';
}

function PaymentSuccessContent() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const bookingId = params.id as string;
  const sessionId = searchParams.get('session_id');

  // Fetch detailed payment breakdown
  const fetchPaymentBreakdown = async () => {
    setIsLoadingBreakdown(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/payment-breakdown`);
      if (response.ok) {
        const data: PaymentBreakdownResponse = await response.json();
        setPaymentBreakdown(data.payment_breakdown);
      }
    } catch (error) {
      console.error('Error fetching payment breakdown:', error);
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        if (!sessionId) {
          toast.error('Missing payment session information');
          router.push('/bookings');
          return;
        }

        // Fetch updated booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            listings:listing_id (
              title,
              images,
              owner_id,
              category,
              price_per_day
            ),
            renter_profile:renter_id (
              full_name,
              email,
              avatar_url
            ),
            owner_profile:owner_id (
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('id', bookingId)
          .single();

        if (bookingError || !bookingData) {
          console.error('Error fetching booking:', {
            error: bookingError,
            code: bookingError?.code,
            message: bookingError?.message,
            details: bookingError?.details,
            hint: bookingError?.hint,
            bookingId: bookingId
          });
          toast.error(`Failed to load booking details: ${bookingError?.message || 'Unknown error'}`);
          router.push('/bookings');
          return;
        }

        // Update booking status to confirmed if payment was successful and still in payment_required
        if (bookingData.status === 'payment_required') {
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status: 'confirmed',
              payment_status: 'succeeded',
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (updateError) {
            console.error('Error updating booking status:', updateError);
          } else {
            bookingData.status = 'confirmed';
            
            // Send notification to owner about completed booking
            try {
              const { BookingNotifications } = await import('@/lib/onesignal/notifications');
              
              await BookingNotifications.notifyOwnerBookingCompleted(
                bookingData.listings.owner_id,
                bookingData.id,
                bookingData.listings.title,
                bookingData.renter_profile?.full_name || 'A user',
                bookingData.total_amount || 0,
                bookingData.start_date,
                bookingData.end_date
              );
              
              console.log('✅ Owner notification sent successfully for booking:', bookingData.id);
              
              // Also create a database notification for the owner
              await supabase.from('notifications').insert({
                user_id: bookingData.listings.owner_id,
                type: 'booking_confirmed',
                title: '🎉 New Booking Confirmed!',
                message: `${bookingData.renter_profile?.full_name || 'A user'} has booked "${bookingData.listings.title}" and paid $${(bookingData.total_amount || 0).toFixed(2)}`,
                related_id: bookingData.id,
                action_url: `/dashboard/bookings/${bookingData.id}`,
                metadata: {
                  booking_id: bookingData.id,
                  renter_name: bookingData.renter_profile?.full_name,
                  amount: bookingData.total_amount,
                  start_date: bookingData.start_date,
                  end_date: bookingData.end_date,
                },
                is_read: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            } catch (notificationError) {
              console.error('⚠️ Failed to send owner notification:', notificationError);
              // Don't fail the payment success flow if notification fails
            }

            // Send confirmation emails
            try {
              const emailResponse = await fetch(`/api/bookings/${bookingId}/send-confirmation-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  bookingId: bookingId
                }),
              });

              const emailResult = await emailResponse.json();
              
              if (emailResult.success) {
                console.log('✅ Confirmation emails sent successfully');
              } else {
                console.warn('⚠️ Some confirmation emails failed to send:', emailResult);
              }
            } catch (emailError) {
              console.error('⚠️ Failed to send confirmation emails:', emailError);
              // Don't fail the payment success flow if emails fail
            }
          }
        }

        setBooking(bookingData);
        
        // Fetch detailed payment breakdown
        await fetchPaymentBreakdown();
        
        // Show success message
        toast.success('Payment successful! Your booking is confirmed.');
        
      } catch (error) {
        console.error('Error handling payment success:', error);
        toast.error('An error occurred while processing your payment');
        router.push('/bookings');
      } finally {
        setIsLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [bookingId, sessionId, router, supabase]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Processing your payment...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!booking) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Booking not found</p>
            <Link href="/bookings">
              <Button className="mt-4">Back to Bookings</Button>
            </Link>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/bookings"
              className="inline-flex items-center text-[#44D62C] hover:text-[#3AB827] font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Link>
          </div>

          {/* Success Header */}
          <div className="text-center mb-10">
            <div className="relative inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Payment Successful!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your booking has been confirmed and payment processed securely. 
              You'll receive a confirmation email shortly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Booking Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Booking Summary */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Calendar className="h-6 w-6 text-green-600" />
                    Booking Confirmation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {booking.listings.title}
                      </h2>
                      <div className="flex items-center gap-4 text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {new Date(booking.start_date).toLocaleDateString('en-AU', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {new Date(booking.end_date).toLocaleDateString('en-AU', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{booking.total_days} day{booking.total_days > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Receipt className="h-4 w-4" />
                          <span>Booking ID: {booking.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 px-3 py-1 text-sm font-semibold">
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>

                  {/* Delivery Information */}
                  {booking.delivery_method === 'delivery' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">Delivery Details</h3>
                      </div>
                      <p className="text-blue-800 text-sm">
                        {booking.delivery_address || 'Delivery address will be confirmed'}
                      </p>
                    </div>
                  )}

                  {/* Host Information */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Your Host</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {booking.owner_profile?.avatar_url ? (
                          <img 
                            src={booking.owner_profile.avatar_url} 
                            alt="Host" 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.owner_profile?.full_name || 'Host'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.owner_profile?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <MessageCircle className="h-6 w-6 text-blue-600" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-blue-600 font-semibold text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Host Notification</h4>
                        <p className="text-gray-600 text-sm">Your host has been automatically notified of your booking and payment.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-blue-600 font-semibold text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Coordinate Pickup</h4>
                        <p className="text-gray-600 text-sm">Message your host to arrange pickup details and any special instructions.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-blue-600 font-semibold text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Secure Payment</h4>
                        <p className="text-gray-600 text-sm">Your payment is held securely until the item is returned in good condition.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t">
                    <Link 
                      href={`/messages?with=${booking.listings.owner_id}&booking=${booking.id}`}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Message Your Host
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Breakdown Sidebar */}
            <div className="space-y-6">
              {/* Payment Summary */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {isLoadingBreakdown ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : paymentBreakdown ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Base Price ({paymentBreakdown.total_days} day{paymentBreakdown.total_days > 1 ? 's' : ''})</span>
                          <span className="font-medium">{formatPrice(paymentBreakdown.subtotal)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Service Fee ({(paymentBreakdown.renter_service_fee_rate * 100).toFixed(0)}%)</span>
                          <span className="font-medium">{formatPrice(paymentBreakdown.renter_service_fee_amount)}</span>
                        </div>

                        {paymentBreakdown.insurance_fee > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Insurance</span>
                            <span className="font-medium">{formatPrice(paymentBreakdown.insurance_fee)}</span>
                          </div>
                        )}

                        {paymentBreakdown.delivery_fee > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Delivery Fee</span>
                            <span className="font-medium">{formatPrice(paymentBreakdown.delivery_fee)}</span>
                          </div>
                        )}

                        {paymentBreakdown.security_deposit > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Security Deposit</span>
                            <span className="font-medium">{formatPrice(paymentBreakdown.security_deposit)}</span>
                          </div>
                        )}

                        {paymentBreakdown.points_credit_applied > 0 && (
                          <div className="flex justify-between items-center text-green-600">
                            <span>Points Credit ({paymentBreakdown.points_redeemed} pts)</span>
                            <span className="font-medium">-{formatPrice(paymentBreakdown.points_credit_applied)}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Total Paid</span>
                          <span className="text-xl font-bold text-green-600">
                            {formatPrice(paymentBreakdown.renter_total_amount)}
                          </span>
                        </div>
                      </div>

                      {paymentBreakdown.points_earned > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                              Points Earned: {paymentBreakdown.points_earned}
                            </span>
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">
                            Added to your account for future bookings
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatPrice(booking.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Service Fee</span>
                        <span className="font-medium">{formatPrice(booking.service_fee)}</span>
                      </div>
                      {booking.delivery_fee > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Delivery Fee</span>
                          <span className="font-medium">{formatPrice(booking.delivery_fee)}</span>
                        </div>
                      )}
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Total Paid</span>
                          <span className="text-xl font-bold text-green-600">
                            {formatPrice(booking.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction Details */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Receipt className="h-5 w-5 text-gray-600" />
                    Transaction Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium">Stripe</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID</span>
                      <span className="font-mono text-xs">{booking.stripe_payment_intent_id?.slice(-8) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time</span>
                      <span className="font-medium">
                        {new Date(booking.created_at).toLocaleDateString('en-AU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency</span>
                      <span className="font-medium">AUD</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.print()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/bookings')} 
                  className="w-full bg-[#44D62C] hover:bg-[#3AB827]"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All Bookings
                </Button>
                <Button 
                  onClick={() => router.push('/browse')} 
                  variant="outline" 
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Browse More Items
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}