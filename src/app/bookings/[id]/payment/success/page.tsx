'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, 
  ArrowLeft, 
  Calendar, 
  MapPin,
  Clock,
  CreditCard
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface BookingDetails {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
  pickup_location: string | null;
  listing: {
    title: string;
    images: string[];
    category: string;
    location: string;
    state: string;
  };
  owner: {
    full_name: string;
    email: string;
    phone_number: string | null;
  };
}

export default function PaymentSuccessPage() {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(true);

  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const bookingId = params.id as string;
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setIsVerifying(false);
      setIsLoading(false);
      toast.error('Invalid payment session');
    }
  }, [sessionId, bookingId]);

  const verifyPayment = async () => {
    try {
      // Call API to verify payment and update booking
      const response = await fetch('/api/payments/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          bookingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      if (data.success) {
        await fetchBookingDetails();
        toast.success('Payment successful! Your booking is confirmed.');
      } else {
        toast.error('Payment verification failed');
        router.push(`/bookings/${bookingId}/payment`);
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Failed to verify payment. Please contact support.');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchBookingDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listings!item_id (
            title,
            images,
            category,
            location,
            state
          ),
          profiles!owner_id (
            full_name,
            email,
            phone_number
          )
        `)
        .eq('id', bookingId)
        .eq('renter_id', user.id)
        .single();

      if (error || !data) {
        console.error('Error fetching booking:', error);
        toast.error('Booking not found');
        router.push('/bookings');
        return;
      }

      const bookingDetails: BookingDetails = {
        ...data,
        listing: data.listings,
        owner: data.profiles
      };

      setBooking(bookingDetails);

    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getDateRange = () => {
    if (!booking) return '';
    const start = format(new Date(booking.start_date), 'MMM d, yyyy');
    const end = format(new Date(booking.end_date), 'MMM d, yyyy');
    return `${start} - ${end}`;
  };

  if (isVerifying) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (isLoading || !booking) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">
            Your booking has been confirmed and payment processed successfully.
          </p>
        </div>

        {/* Booking Summary */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Confirmed</h2>
          
          <div className="space-y-4">
            {/* Item */}
            <div>
              <h3 className="font-medium text-gray-900">{booking.listing.title}</h3>
              <p className="text-gray-600">{booking.listing.category}</p>
              <p className="text-gray-600">{booking.listing.location}, {booking.listing.state}</p>
            </div>

            {/* Dates */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900">{getDateRange()}</span>
            </div>

            {/* Pickup Location */}
            {booking.pickup_location && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">Pickup Location</p>
                  <p className="text-gray-600">{booking.pickup_location}</p>
                </div>
              </div>
            )}

            {/* Payment Amount */}
            <div className="flex items-center space-x-2 pt-4 border-t">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-900">Total Paid</p>
                <p className="text-lg font-semibold text-[#44D62C]">{formatPrice(booking.total_amount)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-[#44D62C] text-white rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Contact the Host</p>
                <p className="text-gray-600 text-sm">
                  Coordinate pickup details with {booking.owner.full_name}
                </p>
                <p className="text-gray-600 text-sm">
                  Email: {booking.owner.email}
                  {booking.owner.phone_number && (
                    <span> • Phone: {booking.owner.phone_number}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-[#44D62C] text-white rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Prepare for Pickup</p>
                <p className="text-gray-600 text-sm">
                  Bring a valid ID and be on time for the scheduled pickup
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Confirm Pickup</p>
                <p className="text-gray-600 text-sm">
                  Take photos and confirm pickup through the app
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => router.push('/bookings')}
            className="flex-1 bg-[#44D62C] hover:bg-[#3AB827] text-white"
          >
            View All Bookings
          </Button>
          <Button
            onClick={() => window.open(`mailto:${booking.owner.email}`)}
            variant="outline"
            className="flex-1"
          >
            Contact Host
          </Button>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center text-[#44D62C] hover:text-[#3AB827] font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 