'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  CreditCard, 
  Shield, 
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign
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
  subtotal: number;
  service_fee: number;
  deposit_amount: number;
  renter_message: string | null;
  pickup_location: string | null;
  pickup_instructions: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: string;
  listing: {
    id: string;
    title: string;
    images: string[];
    price_per_day: number;
    category: string;
    location: string;
    state: string;
  };
  owner: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function PaymentPage() {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const bookingId = params.id as string;

  useEffect(() => {
    initializePage();
  }, [bookingId]);

  const initializePage = async () => {
    // First check user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    
    // Then fetch booking details with user context
    await fetchBookingDetails(user);
  };

  const fetchBookingDetails = async (currentUser: any) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listings!listing_id (
            id,
            title,
            images,
            price_per_day,
            category,
            location,
            state
          ),
          profiles!owner_id (
            id,
            full_name,
            email
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        toast.error('Booking not found');
        router.push('/bookings');
        return;
      }

      // Check if user is authorized to pay for this booking
      if (data.renter_id !== currentUser.id) {
        toast.error('You are not authorized to pay for this booking');
        router.push('/bookings');
        return;
      }

      // Transform data to match interface
      const bookingDetails: BookingDetails = {
        ...data,
        listing: data.listings,
        owner: data.profiles
      };

      setBooking(bookingDetails);

      // Check if payment is required
      if (data.status !== 'payment_required') {
        toast.error('Payment is not required for this booking');
        router.push('/bookings');
        return;
      }

    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
      router.push('/bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!booking || !user) return;

    setIsProcessing(true);
    try {
      // Call API to create Stripe Checkout session
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
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

  const getTotalDays = () => {
    if (!booking) return 0;
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!booking) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking not found</h1>
            <Link
              href="/bookings"
              className="text-[#44D62C] hover:text-[#3AB827] font-medium"
            >
              Back to Bookings
            </Link>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/bookings"
            className="inline-flex items-center text-[#44D62C] hover:text-[#3AB827] font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Payment</h1>
          <p className="text-gray-600 mt-2">Your booking has been approved and is ready for payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Summary */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
              
              {/* Item Details */}
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-24 h-24 flex-shrink-0">
                  <Image
                    src={booking.listing.images[0] || '/images/placeholder-item.svg'}
                    alt={booking.listing.title}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{booking.listing.title}</h3>
                  <p className="text-gray-600">{booking.listing.category}</p>
                  <p className="text-gray-600">{booking.listing.location}, {booking.listing.state}</p>
                  <p className="text-sm text-[#44D62C] font-medium mt-1">
                    {formatPrice(booking.listing.price_per_day)}/day
                  </p>
                </div>
              </div>

              {/* Rental Details */}
              <div className="space-y-4 pb-6 border-b">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rental Period</span>
                  <span className="font-medium">{getDateRange()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{getTotalDays()} {getTotalDays() === 1 ? 'day' : 'days'}</span>
                </div>
                {booking.pickup_location && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pickup Location</span>
                    <span className="font-medium text-right max-w-xs">{booking.pickup_location}</span>
                  </div>
                )}
                {booking.renter_message && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Message</span>
                    <span className="font-medium text-right max-w-xs">{booking.renter_message}</span>
                  </div>
                )}
              </div>

              {/* Owner Contact */}
              <div className="pt-6">
                <h4 className="font-semibold text-gray-900 mb-2">Host Contact</h4>
                <p className="text-gray-600">{booking.owner.full_name}</p>
                <p className="text-gray-600">{booking.owner.email}</p>
              </div>
            </Card>

            {/* Security Notice */}
            <Card className="p-6 mt-6">
              <div className="flex items-start space-x-3">
                <Shield className="h-6 w-6 text-[#44D62C] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Secure Payment Protection</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Your payment is processed securely by Stripe</li>
                    <li>• Deposit is held in escrow until item return</li>
                    <li>• 24/7 customer support available</li>
                    <li>• Full refund if booking is cancelled</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Panel */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              
              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {formatPrice(booking.listing.price_per_day)} × {getTotalDays()} {getTotalDays() === 1 ? 'day' : 'days'}
                  </span>
                  <span>{formatPrice(booking.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service fee</span>
                  <span>{formatPrice(booking.service_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security deposit</span>
                  <span>{formatPrice(booking.deposit_amount)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(booking.total_amount)}</span>
                </div>
              </div>

              {/* Status */}
              <div className="mb-6 p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span className="text-purple-600 font-medium">Payment Required</span>
                </div>
                <p className="text-purple-600 text-sm mt-1">
                  Your booking has been approved by the host
                </p>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-[#44D62C] hover:bg-[#3AB827] text-white py-3 text-lg font-semibold"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Pay {formatPrice(booking.total_amount)}</span>
                  </div>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-3">
                Secure payment powered by Stripe
              </p>

              {/* Cancellation Policy */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Cancellation Policy</h4>
                <p className="text-sm text-gray-600">
                  Free cancellation up to 24 hours before the rental start date. 
                  Service fees are non-refundable.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 