'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, CreditCardIcon, ShieldCheckIcon } from 'lucide-react';
import { formatPrice } from '@/lib/pricing-constants';

interface Booking {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  subtotal: number;
  service_fee: number;
  insurance_fee: number;
  delivery_fee?: number;
  total_amount: number;
  status: string;
  delivery_method: string;
  delivery_address?: string;
  renter_message?: string;
  listings: {
    id: string;
    title: string;
    price_per_day: number;
    images: string[];
    owner_id: string;
    profiles: {
      full_name: string;
    };
  };
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = createClient();

  const bookingId = params.id as string;

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [params.id]);

  const fetchBooking = async () => {
    try {
      // First get the booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error('Error fetching booking:', {
          error: bookingError,
          code: bookingError.code,
          message: bookingError.message,
          details: bookingError.details,
          hint: bookingError.hint,
          bookingId
        });
        toast.error(`Failed to load booking: ${bookingError.message || 'Unknown error'}`);
        router.push('/bookings');
        return;
      }

      // Then get the listing data
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('id, title, price_per_day, images, owner_id')
        .eq('id', bookingData.listing_id)
        .single();

      if (listingError) {
        console.error('Error fetching listing:', listingError);
        toast.error('Failed to load listing details');
        router.push('/bookings');
        return;
      }

      // Finally get the owner profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', listingData.owner_id)
        .single();

      let finalProfileData = profileData;
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Don't fail completely, just use a fallback
        finalProfileData = { full_name: 'Unknown Host' };
      }

      // Combine the data to match the expected structure
      const combinedData = {
        ...bookingData,
        listings: {
          ...listingData,
          profiles: finalProfileData
        }
      };

      setBooking(combinedData);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An error occurred while loading booking details');
      router.push('/bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!booking) return;

    setIsProcessing(true);
    try {
      // TODO: Implement Stripe payment processing
      // For now, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update booking status to payment_required or confirmed
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'payment_required' // This would be 'confirmed' after successful payment
        })
        .eq('id', booking.id);

      if (error) {
        throw error;
      }

      toast.success('Payment processing initiated! You will be notified once the owner approves your booking.');
      router.push('/bookings');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Use total_days from database instead of calculating

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#44D62C] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
            <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => router.push('/bookings')}>
              Go to My Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const duration = booking.total_days;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
          <p className="text-gray-600">Review your booking details and complete payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  {booking.listings.images[0] && (
                    <img
                      src={booking.listings.images[0]}
                      alt={booking.listings.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{booking.listings.title}</h3>
                    <p className="text-gray-600">Hosted by {booking.listings.profiles.full_name}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Check-in</h4>
                    <p className="text-gray-600">{formatDate(booking.start_date)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Check-out</h4>
                    <p className="text-gray-600">{formatDate(booking.end_date)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Duration</h4>
                  <p className="text-gray-600">{duration} {duration === 1 ? 'day' : 'days'}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Delivery Method</h4>
                  <p className="text-gray-600 capitalize">{booking.delivery_method}</p>
                  {booking.delivery_address && (
                    <p className="text-sm text-gray-500 mt-1">Delivery to: {booking.delivery_address}</p>
                  )}
                </div>

                {booking.renter_message && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Message to Host</h4>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{booking.renter_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {formatPrice(booking.listings.price_per_day)} × {duration} days
                    </span>
                    <span>{formatPrice(booking.subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service fee</span>
                    <span>{formatPrice(booking.service_fee)}</span>
                  </div>
                  
                  {booking.insurance_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <ShieldCheckIcon className="h-4 w-4" />
                        Damage protection
                      </span>
                      <span>{formatPrice(booking.insurance_fee)}</span>
                    </div>
                  )}
                  
                  {booking.delivery_fee && booking.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery fee</span>
                      <span>{formatPrice(booking.delivery_fee)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(booking.total_amount)}</span>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-[#44D62C] hover:bg-[#3AB827] text-white py-3 text-lg font-semibold"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    'Complete Payment'
                  )}
                </Button>

                <div className="text-xs text-gray-500 text-center">
                  You won't be charged until the host approves your booking request.
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Your payment will be authorized (not charged)</li>
                  <li>• The host will be notified of your request</li>
                  <li>• You'll be charged only if the host approves</li>
                  <li>• If declined, your authorization will be released</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}