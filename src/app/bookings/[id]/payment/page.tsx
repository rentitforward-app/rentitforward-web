'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, MapPin, User } from 'lucide-react';
import Link from 'next/link';

interface BookingData {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  deposit_amount: number;
  delivery_method: string;
  delivery_address?: string;
  status: string;
  payment_status: string;
  stripe_payment_intent_id?: string;
  client_secret?: string;
  stripe_account_id?: string;
  listings: {
    title: string;
    images: string[];
    daily_rate: number;
    deposit_amount: number;
  };
  owner_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/payment`);
        const data = await response.json();

        if (response.ok) {
          setBooking(data.booking);
          
          // Check if payment is already complete
          if (data.booking.payment_status === 'paid') {
            setPaymentComplete(true);
          }
        } else {
          setError(data.error || 'Failed to load booking details');
        }
      } catch (err) {
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const handlePaymentSuccess = async (paymentIntent: any) => {
    setPaymentComplete(true);
    
    // Redirect to booking confirmation after a brief delay
    setTimeout(() => {
      router.push(`/bookings/${bookingId}/confirmation`);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button asChild>
              <Link href="/bookings">Back to Bookings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
            <p className="text-gray-600 mb-4">The requested booking could not be found.</p>
            <Button asChild>
              <Link href="/bookings">Back to Bookings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your booking has been confirmed. You'll be redirected to the confirmation page shortly.
            </p>
            <Button asChild>
              <Link href={`/bookings/${bookingId}/confirmation`}>View Confirmation</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/bookings">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Link>
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Payment</h1>
          <p className="text-gray-600 mt-2">Secure your booking with a quick payment</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Booking Details */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
                
                <div className="space-y-4">
                  {/* Listing Info */}
                  <div className="flex items-start space-x-4">
                    {booking.listings.images[0] && (
                      <img
                        src={booking.listings.images[0]}
                        alt={booking.listings.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{booking.listings.title}</h3>
                      <p className="text-gray-600">${booking.listings.daily_rate}/day</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-5 h-5 mr-3" />
                    <span>
                      {new Date(booking.start_date).toLocaleDateString()} - {' '}
                      {new Date(booking.end_date).toLocaleDateString()} ({booking.total_days} days)
                    </span>
                  </div>

                  {/* Delivery Method */}
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3" />
                    <span className="capitalize">{booking.delivery_method}</span>
                    {booking.delivery_address && (
                      <span className="ml-2">to {booking.delivery_address}</span>
                    )}
                  </div>

                  {/* Owner */}
                  <div className="flex items-center text-gray-600">
                    <User className="w-5 h-5 mr-3" />
                    <span>Owner: {booking.owner_profile.full_name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rental ({booking.total_days} days)</span>
                    <span>${booking.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fee</span>
                    <span>${booking.service_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Security Deposit</span>
                    <span>${booking.deposit_amount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${(booking.total_amount + booking.deposit_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 Your security deposit will be refunded after the item is returned in good condition.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div>
            {booking.client_secret ? (
              <PaymentForm
                clientSecret={booking.client_secret}
                amount={booking.total_amount + booking.deposit_amount}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                bookingDetails={{
                  listing_title: booking.listings.title,
                  total_amount: booking.total_amount,
                  service_fee: booking.service_fee,
                  deposit_amount: booking.deposit_amount,
                }}
                stripeAccountId={booking.stripe_account_id}
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Setup Required</h3>
                  <p className="text-gray-600 mb-4">
                    The owner needs to complete their payment setup before you can complete this booking.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/contact">Contact Support</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 