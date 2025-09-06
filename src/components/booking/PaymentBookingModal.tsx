'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { X, Calendar as CalendarIcon, CreditCard, Loader2 } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import { AvailabilityCalendar } from './AvailabilityCalendar';
import { PricingBreakdown } from './PricingBreakdown';
import { DateRangeSelection } from '@/lib/calendar-utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Form validation schema
const bookingSchema = z.object({
  notes: z.string().optional(),
  deliveryMethod: z.enum(['pickup', 'delivery'], {
    required_error: 'Please select a delivery method',
  }),
  deliveryAddress: z.string().optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

interface PaymentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
  user: any;
}

interface PaymentFormProps {
  bookingData: any;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Payment form component (needs to be inside Elements provider)
function PaymentForm({ bookingData, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!stripe || !elements) {
      onError('Stripe not loaded');
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm payment
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        return;
      }

      // Confirm booking on backend
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: bookingData.paymentIntentId,
          bookingId: bookingData.bookingId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        onError(errorData.error || 'Failed to confirm booking');
        return;
      }

      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      onError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">Payment Details</h3>
        <PaymentElement />
      </div>
      
      <Button
        onClick={handlePayment}
        disabled={!stripe || isProcessing}
        className="w-full bg-[#44D62C] hover:bg-[#3AB827] text-white py-3"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing Payment...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Complete Booking - ${bookingData.amount / 100}
          </div>
        )}
      </Button>
    </div>
  );
}

export function PaymentBookingModal({ isOpen, onClose, listing, user }: PaymentBookingModalProps) {
  const router = useRouter();
  const supabase = createClient();
  
  // State management
  const [selectedDates, setSelectedDates] = useState<{startDate: Date | null; endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  const [showPricing, setShowPricing] = useState(false);
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'booking' | 'payment'>('booking');

  // Form setup
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      deliveryMethod: 'pickup',
    },
  });

  const watchDeliveryMethod = watch('deliveryMethod');

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setSelectedDates({ startDate: null, endDate: null });
      setShowPricing(false);
      setIncludeInsurance(false);
      setCurrentStep('booking');
      setPaymentData(null);
    }
  }, [isOpen]);

  // Show pricing when dates are selected
  useEffect(() => {
    setShowPricing(!!(selectedDates.startDate && selectedDates.endDate));
  }, [selectedDates]);

  const onSubmitBooking = async (data: BookingForm) => {
    if (!user || !listing) {
      toast.error('Please log in to make a booking');
      return;
    }

    if (!selectedDates.startDate || !selectedDates.endDate) {
      toast.error('Please select dates to continue');
      return;
    }

    setIsCreatingBooking(true);
    try {
      // Calculate booking details (inclusive duration)
      const totalDays = Math.ceil((selectedDates.endDate.getTime() - selectedDates.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Safe price parsing
      let pricePerDay = 0;
      if (listing?.price_per_day) {
        const rawPrice = typeof listing.price_per_day === 'string' 
          ? parseFloat(listing.price_per_day) 
          : Number(listing.price_per_day);
        pricePerDay = isNaN(rawPrice) ? 0 : rawPrice;
      }
      
      if (pricePerDay <= 0) {
        toast.error('Invalid listing price. Please contact support.');
        return;
      }
      
      const subtotal = pricePerDay * totalDays;
      const serviceFee = parseFloat((subtotal * 0.15).toFixed(2));
      const insuranceFee = includeInsurance ? parseFloat((subtotal * 0.10).toFixed(2)) : 0;
      const deliveryFee = data.deliveryMethod === 'delivery' ? 20.00 : 0; // $20 delivery fee
      const totalAmount = subtotal + serviceFee + insuranceFee + deliveryFee;

      // Check if user is trying to book their own listing
      if (user.id === listing.owner_id) {
        toast.error('You cannot book your own listing');
        return;
      }

      // Convert dates to local timezone strings to avoid UTC conversion issues
      const startDateStr = selectedDates.startDate.getFullYear() + '-' + 
        String(selectedDates.startDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(selectedDates.startDate.getDate()).padStart(2, '0');
      const endDateStr = selectedDates.endDate.getFullYear() + '-' + 
        String(selectedDates.endDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(selectedDates.endDate.getDate()).padStart(2, '0');

      // Check for conflicts
      console.log('Checking conflicts for dates:', { startDateStr, endDateStr, listingId: listing.id });
      const { data: conflictCheck, error: conflictError } = await supabase
        .rpc('check_booking_conflicts', {
          p_listing_id: listing.id,
          p_start_date: startDateStr,
          p_end_date: endDateStr,
          p_exclude_booking_id: null,
        });

      console.log('Conflict check result:', { conflictCheck, conflictError });

      if (conflictError) {
        console.error('Conflict check error:', conflictError);
        toast.error('Failed to check availability. Please try again.');
        return;
      }

      if (conflictCheck) {
        console.log('Dates conflict detected for:', { startDateStr, endDateStr });
        toast.error('Sorry, these dates are no longer available. Please select different dates and try again.');
        return;
      }

      // Create the booking with expiration
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 30); // 30 minutes from now
      
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          listing_id: listing.id,
          renter_id: user.id,
          owner_id: listing.owner_id,
          start_date: startDateStr,
          end_date: endDateStr,
          price_per_day: pricePerDay,
          subtotal: subtotal,
          service_fee: serviceFee,
          insurance_fee: insuranceFee,
          delivery_fee: deliveryFee,
          deposit_amount: 0, // Security deposit (can be configured later)
          total_amount: totalAmount,
          delivery_method: data.deliveryMethod,
          delivery_address: data.deliveryMethod === 'delivery' ? data.deliveryAddress || null : null,
          renter_message: data.notes || null,
          status: 'payment_required',
          expires_at: expirationTime.toISOString(),
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        toast.error(`Failed to create booking: ${bookingError.message || 'Please try again.'}`);
        return;
      }

      // Create Stripe checkout session using existing working flow
      const sessionResponse = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bookingId: bookingData.id,
          userId: user.id
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        console.error('Session creation error:', errorData);
        toast.error(`Failed to create payment session: ${errorData.error || 'Please try again.'}`);
        return;
      }

      const { url } = await sessionResponse.json();
      
      toast.success('Booking created! Redirecting to Stripe for payment...');
      onClose(); // Close modal
      
      // Redirect to Stripe Checkout (checkout.stripe.com with escrow)
      window.location.href = url;

    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('🎉 Booking confirmed! Your payment was successful.');
    onClose();
    router.push('/bookings');
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
    // Could optionally go back to booking step or stay on payment
  };

  if (!isOpen) return null;

  // Calculate pricing for display (inclusive duration)
  const totalDays = selectedDates.startDate && selectedDates.endDate 
    ? Math.ceil((selectedDates.endDate.getTime() - selectedDates.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  
  // Pricing calculation is working correctly
  
  // Safe price parsing with fallback
  let pricePerDay = 0;
  if (listing?.price_per_day) {
    const rawPrice = typeof listing.price_per_day === 'string' 
      ? parseFloat(listing.price_per_day) 
      : Number(listing.price_per_day);
    pricePerDay = isNaN(rawPrice) ? 0 : rawPrice;
  }
  
  const subtotal = totalDays > 0 && pricePerDay > 0 ? pricePerDay * totalDays : 0;
  const serviceFee = subtotal > 0 ? parseFloat((subtotal * 0.15).toFixed(2)) : 0;
  const insuranceFee = includeInsurance && subtotal > 0 ? parseFloat((subtotal * 0.10).toFixed(2)) : 0;
  const deliveryFee = watchDeliveryMethod === 'delivery' ? 20.00 : 0; // $20 delivery fee
  const totalAmount = subtotal + serviceFee + insuranceFee + deliveryFee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            {currentStep === 'booking' ? (
              <CalendarIcon className="h-6 w-6 text-[#44D62C]" />
            ) : (
              <CreditCard className="h-6 w-6 text-[#44D62C]" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentStep === 'booking' ? 'Book' : 'Pay for'} {listing.title}
              </h2>
              <p className="text-sm text-gray-600">
                {currentStep === 'booking' 
                  ? 'Select dates and complete your booking' 
                  : 'Complete payment to confirm your booking'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {currentStep === 'booking' ? (
            /* Booking Step */
            <form onSubmit={handleSubmit(onSubmitBooking)} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Calendar */}
                <div className="space-y-6">
                  <AvailabilityCalendar
                    listingId={listing.id}
                    selectedRange={selectedDates}
                    onDatesSelected={setSelectedDates}
                  />
                </div>
                
                {/* Right Column - Form & Pricing */}
                <div className="space-y-6">
                  {/* Pricing Breakdown */}
                  {showPricing && (
                    <PricingBreakdown
                      basePrice={pricePerDay}
                      duration={totalDays}
                      hasInsurance={includeInsurance}
                      onInsuranceChange={setIncludeInsurance}
                      hasWeeklyRate={false}
                      weeklyRate={0}
                      securityDeposit={0}
                    />
                  )}
                  
                  {/* Booking Form */}
                  {showPricing && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold">Booking Details</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Method
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="pickup"
                              {...register('deliveryMethod')}
                              className="mr-2"
                            />
                            Pickup
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="delivery"
                              {...register('deliveryMethod')}
                              className="mr-2"
                            />
                            Delivery (+$20)
                          </label>
                        </div>
                        {errors.deliveryMethod && (
                          <p className="text-red-500 text-sm mt-1">{errors.deliveryMethod.message}</p>
                        )}
                      </div>
                      
                      {watchDeliveryMethod === 'delivery' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delivery Address
                          </label>
                          <textarea
                            {...register('deliveryAddress')}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            rows={2}
                            placeholder="Enter delivery address..."
                          />
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes for Host (Optional)
                        </label>
                        <textarea
                          {...register('notes')}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          rows={3}
                          placeholder="Any special requests or information..."
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={isCreatingBooking || !selectedDates.startDate || !selectedDates.endDate}
                        className="w-full bg-[#44D62C] hover:bg-[#3AB827] text-white py-3"
                      >
                        {isCreatingBooking ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating Booking...
                          </div>
                        ) : (
                          `Proceed to Payment - $${totalAmount.toFixed(2)}`
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </form>
          ) : (
            /* Payment Step */
            <div className="p-6">
              {paymentData && (
                <Elements 
                  stripe={stripePromise} 
                  options={{
                    clientSecret: paymentData.clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#44D62C',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    bookingData={paymentData}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}