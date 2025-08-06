'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { XCircle, ArrowLeft, Calendar, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

function PaymentCancelContent() {
  const [isUpdating, setIsUpdating] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handlePaymentCancel = async () => {
      try {
        const bookingId = searchParams.get('booking_id');

        if (bookingId) {
          // Update booking status to cancelled since payment was not completed
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ 
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (updateError) {
            console.error('Error updating booking status:', updateError);
          }
        }

        toast.error('Payment was cancelled. Your booking has been cancelled.');
        
      } catch (error) {
        console.error('Error handling payment cancellation:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    handlePaymentCancel();
  }, [searchParams, supabase]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-lg text-gray-600">
            Your booking was not completed
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">What happened?</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              You cancelled the payment process. Your booking has been cancelled and no charges were made to your account.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Want to try again?</h3>
              <p className="text-yellow-800 text-sm">
                The item is still available. You can create a new booking anytime.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={() => router.back()} 
              variant="outline" 
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => router.push('/browse')} 
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Browse Items
            </Button>
          </div>
          
          <Button 
            onClick={() => router.push('/bookings')} 
            variant="ghost" 
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" />
            View My Bookings
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}