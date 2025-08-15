'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Calendar, Home, Loader2, ArrowLeft, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Booking {
  id: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  listings: {
    title: string;
    images: string[];
    owner_id: string;
  };
  renter_profile?: {
    full_name: string;
    email: string;
  };
}

function PaymentSuccessContent() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const bookingId = params.id as string;
  const sessionId = searchParams.get('session_id');

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
              owner_id
            ),
            renter_profile:renter_id (
              full_name,
              email
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
        </div>

        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your booking has been confirmed and payment processed
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
                  {formatPrice(booking.total_amount)}
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
              <li>• Your payment is held securely in escrow until item return</li>
              <li>• Message the host to coordinate pickup details</li>
            </ul>
            
            <div className="mt-4 pt-3 border-t border-blue-200 space-y-2">
              <Link 
                href={`/messages?with=${booking.listings.owner_id}&booking=${booking.id}`}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Go to Messages
              </Link>
              <p className="text-xs text-blue-700">
                Look for a conversation with your host to coordinate pickup details
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Escrow Protection</h3>
            <ul className="text-green-800 space-y-1">
              <li>• Your payment is protected by Stripe Connect</li>
              <li>• Funds are held in escrow until successful item return</li>
              <li>• Platform fee and owner payment are automatically separated</li>
              <li>• Security deposit will be refunded after item return</li>
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