'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Calendar, Home, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';

interface Booking {
  id: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  listings: {
    title: string;
    images: string[];
  };
}

export default function PaymentSuccessPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        // Get booking ID from URL parameters (Stripe can pass custom data)
        const sessionId = searchParams.get('session_id');
        const bookingId = searchParams.get('booking_id');

        if (!bookingId) {
          toast.error('Missing booking information');
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
              images
            )
          `)
          .eq('id', bookingId)
          .single();

        if (bookingError || !bookingData) {
          console.error('Error fetching booking:', bookingError);
          toast.error('Failed to load booking details');
          router.push('/bookings');
          return;
        }

        // Update booking status to confirmed if payment was successful
        if (bookingData.status === 'payment_pending') {
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status: 'confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (updateError) {
            console.error('Error updating booking status:', updateError);
          } else {
            bookingData.status = 'confirmed';
          }
        }

        setBooking(bookingData);
        
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
  }, [searchParams, router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Booking not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your booking has been confirmed
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{booking.listings.title}</h3>
                <p className="text-gray-600">
                  {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {booking.status}
              </Badge>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Paid:</span>
                <span className="text-xl font-bold text-green-600">
                  ${booking.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
            <ul className="text-blue-800 space-y-1">
              <li>• You'll receive a confirmation email shortly</li>
              <li>• The host will be notified of your booking</li>
              <li>• Check your messages for coordination details</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => router.push('/bookings')} className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              View My Bookings
            </Button>
            <Button 
              onClick={() => router.push('/browse')} 
              variant="outline" 
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Browse More Items
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}