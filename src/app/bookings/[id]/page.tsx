'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  CalendarDays, 
  MapPin, 
  User, 
  MessageCircle, 
  CreditCard, 
  ArrowLeft,
  Clock,
  Receipt,
  Download,
  Shield,
  Truck,
  CheckCircle,
  AlertCircle,
  XCircle,
  Mail,
  Phone,
  Navigation,
  Package,
  Flag,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import DashboardWrapper from '@/components/DashboardWrapper';
import { BookingActions, MapActions } from '@/components/booking/BookingActions';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getBookingDetails(bookingId: string, userId: string) {
  const supabase = createClient();
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      listings!listing_id (
        id,
        title,
        description,
        images,
        price_per_day,
        category,
        location,
        city,
        state,
        country
      ),
      profiles!owner_id (
        id,
        full_name,
        avatar_url
      ),
      renter:profiles!renter_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('id', bookingId)
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .single();

  if (error || !booking) {
    return null;
  }

  return booking;
}

async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

function BookingDetailsSkeleton() {
  return (
    <DashboardWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
              <div className="flex justify-center gap-4">
                <div className="h-8 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-24 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-6">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-24 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}

function BookingDetailsContent({ params }: PageProps) {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string>('');
  const [existingReview, setExistingReview] = useState<any>(null);
  const [reviewCheckLoading, setReviewCheckLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Resolve params
        const resolvedParams = await params;
        setBookingId(resolvedParams.id);
        
        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login?redirectTo=' + encodeURIComponent(`/bookings/${resolvedParams.id}`));
          return;
        }
        setUser(currentUser);

        // Get booking details
        const bookingDetails = await getBookingDetails(resolvedParams.id, currentUser.id);
        if (!bookingDetails) {
          setError('Booking not found');
          return;
        }
        
        setBooking(bookingDetails);
        
        // After booking is loaded, check for existing review
        if (bookingDetails && currentUser) {
          await checkExistingReview(bookingDetails, currentUser);
        }
      } catch (err) {
        console.error('Error loading booking:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params, router]);

  // Function to check if user has already reviewed this booking
  const checkExistingReview = async (bookingData: any, userData: any) => {
    // Return confirmation status
    const renterConfirmedReturn = bookingData.return_confirmed_by_renter || false;
    const ownerConfirmedReturn = bookingData.return_confirmed_by_owner || false;
    const bothReturnConfirmed = renterConfirmedReturn && ownerConfirmedReturn;
    
    // Only check for reviews if booking is completed OR both parties confirmed return
    if (bookingData.status !== 'completed' && !bothReturnConfirmed) {
      setReviewCheckLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      const { data: reviewData, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          type,
          profiles:reviewer_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('booking_id', bookingData.id)
        .eq('reviewer_id', userData.id)
        .single();

      if (reviewData) {
        setExistingReview(reviewData);
      } else {
        setExistingReview(null);
      }
    } catch (error) {
      console.error('Error checking existing review:', error);
    } finally {
      setReviewCheckLoading(false);
    }
  };

  if (loading) {
    return <BookingDetailsSkeleton />;
  }

  if (error) {
    return (
      <DashboardWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </DashboardWrapper>
    );
  }

  if (!booking || !user) {
    return <BookingDetailsSkeleton />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_required':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending Approval';
      case 'payment_required':
        return 'Payment Required';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const duration = booking.total_days;
  
  // Determine if current user is the owner or renter
  const isOwner = booking.owner_id === user.id;
  const isRenter = booking.renter_id === user.id;
  
  // Calculate pickup date info with new timing (start date 00:00 to end date 23:59)
  const today = new Date();
  const startOfPickupPeriod = new Date(startDate);
  startOfPickupPeriod.setHours(0, 0, 0, 0);
  
  const endOfPickupPeriod = new Date(endDate);
  endOfPickupPeriod.setHours(23, 59, 59, 999);
  
  const isWithinPickupPeriod = today >= startOfPickupPeriod && today <= endOfPickupPeriod;
  const isAfterPickupPeriod = today > endOfPickupPeriod;
  
  const canConfirmPickup = isWithinPickupPeriod && booking.status === 'confirmed';
  const canReturn = isAfterPickupPeriod && (booking.status === 'active' || booking.status === 'picked_up');
  const hasBeenPickedUp = booking.status === 'active' || booking.status === 'picked_up';

  // Calculate pickup confirmation states
  const isWithinOrAfterRentalPeriod = today >= startOfPickupPeriod;
  
  // Pickup confirmation status
  const renterConfirmedPickup = booking.pickup_confirmed_by_renter || false;
  const ownerConfirmedPickup = booking.pickup_confirmed_by_owner || false;
  const bothPickupConfirmed = renterConfirmedPickup && ownerConfirmedPickup;
  const currentUserPickupConfirmed = (isRenter && renterConfirmedPickup) || (isOwner && ownerConfirmedPickup);
  const otherPartyPickupConfirmed = (isRenter && ownerConfirmedPickup) || (isOwner && renterConfirmedPickup);
  
  // Return confirmation status
  const renterConfirmedReturn = booking.return_confirmed_by_renter || false;
  const ownerConfirmedReturn = booking.return_confirmed_by_owner || false;
  const bothReturnConfirmed = renterConfirmedReturn && ownerConfirmedReturn;
  const currentUserReturnConfirmed = (isRenter && renterConfirmedReturn) || (isOwner && ownerConfirmedReturn);
  const otherPartyReturnConfirmed = (isRenter && ownerConfirmedReturn) || (isOwner && renterConfirmedReturn);

  // Show pickup button logic
  const showPickupButton = booking.status === 'confirmed' || booking.status === 'payment_required' || bothPickupConfirmed || currentUserReturnConfirmed;
  
  // Get pickup button configuration
  const getPickupButtonConfig = () => {
    let pickupButtonText = '';
    let pickupButtonNote = '';
    let buttonAction = null;
    let isDisabled = false;
    let buttonIcon = Package;
    let buttonColor = 'bg-green-600 hover:bg-green-700 text-white';
    
    // Return confirmation states (highest priority)
    if (currentUserReturnConfirmed && !otherPartyReturnConfirmed) {
      // Current user confirmed return, waiting for other party
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = `Waiting for ${otherPartyName} return confirmation`;
      pickupButtonNote = `You've confirmed the return. Waiting for the ${otherPartyName} to verify and confirm return.`;
      isDisabled = true;
      buttonIcon = CheckCircle;
      buttonColor = 'bg-gray-500 text-white cursor-not-allowed';
    } else if (!currentUserReturnConfirmed && otherPartyReturnConfirmed) {
      // Other party confirmed return, current user needs to confirm
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = 'Verify Return';
      pickupButtonNote = `The ${otherPartyName} has confirmed return. Please verify the item and confirm.`;
      buttonAction = () => window.location.href = `/bookings/${booking.id}/return-verification`;
      buttonIcon = Flag;
      buttonColor = 'bg-blue-600 hover:bg-blue-700 text-white';
    } else if (bothReturnConfirmed) {
      // Both confirmed return - booking completed
      pickupButtonText = 'Return Completed';
      pickupButtonNote = 'Both parties have confirmed return. The rental is now complete.';
      isDisabled = true;
      buttonIcon = CheckCircle;
      buttonColor = 'bg-gray-500 text-white cursor-not-allowed';
    } 
    // Return available states
    else if (bothPickupConfirmed && isWithinOrAfterRentalPeriod && booking.status !== 'completed' && !currentUserReturnConfirmed) {
      pickupButtonText = 'Verify Return';
      pickupButtonNote = 'The rental period is active. You can now verify and confirm the return of the item.';
      buttonAction = () => window.location.href = `/bookings/${booking.id}/return-verification`;
      buttonIcon = Flag;
      buttonColor = 'bg-blue-600 hover:bg-blue-700 text-white';
    } 
    // Pickup confirmation states
    else if (bothPickupConfirmed && !isWithinOrAfterRentalPeriod) {
      // Both confirmed pickup but return not yet available
      pickupButtonText = 'Pickup Confirmed';
      pickupButtonNote = 'Both parties have confirmed pickup. Return verification will be available during the rental period.';
      isDisabled = true;
      buttonIcon = CheckCircle;
      buttonColor = 'bg-gray-500 text-white cursor-not-allowed';
    } else if (currentUserPickupConfirmed && !otherPartyPickupConfirmed) {
      // Current user confirmed pickup, waiting for other party
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = `Waiting for ${otherPartyName} confirmation`;
      pickupButtonNote = `You've confirmed pickup. Waiting for the ${otherPartyName} to verify and confirm pickup.`;
      isDisabled = true;
      buttonIcon = CheckCircle;
      buttonColor = 'bg-gray-500 text-white cursor-not-allowed';
    } else if (!currentUserPickupConfirmed && otherPartyPickupConfirmed) {
      // Other party confirmed pickup, current user needs to confirm
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = 'Verify Pickup';
      pickupButtonNote = `The ${otherPartyName} has confirmed pickup. Please verify the item and confirm.`;
      buttonAction = () => window.location.href = `/bookings/${booking.id}/pickup-verification`;
    } 
    // Initial pickup states
    else if (today < startOfPickupPeriod) {
      pickupButtonText = 'Verify Pickup (Not Available Yet)';
      const daysUntil = Math.ceil((startOfPickupPeriod.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      pickupButtonNote = `Pickup verification will be available starting ${startDate.toLocaleDateString()} at 12:00 AM (${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now)`;
      isDisabled = true;
      buttonColor = 'bg-gray-300 text-gray-500 cursor-not-allowed';
    } else if (isAfterPickupPeriod && !bothPickupConfirmed) {
      pickupButtonText = 'Pickup Date Passed';
      pickupButtonNote = 'Pickup date has passed. Contact support if you need assistance.';
      isDisabled = true;
      buttonColor = 'bg-gray-300 text-gray-500 cursor-not-allowed';
    } else if (isWithinPickupPeriod && booking.status !== 'confirmed') {
      pickupButtonText = 'Complete Payment First';
      pickupButtonNote = 'Complete payment first to enable pickup verification.';
      isDisabled = true;
      buttonColor = 'bg-gray-300 text-gray-500 cursor-not-allowed';
    } else {
      pickupButtonText = 'Verify Pickup';
      pickupButtonNote = 'Verify the item pickup to start the rental period.';
      buttonAction = () => window.location.href = `/bookings/${booking.id}/pickup-verification`;
    }

    return { pickupButtonText, pickupButtonNote, buttonAction, isDisabled, buttonIcon, buttonColor };
  };

  return (
    <DashboardWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Back Navigation */}
            <div className="mb-4">
              <Link
                href="/bookings"
                className="inline-flex items-center text-[#44D62C] hover:text-[#3AB827] font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Bookings
              </Link>
            </div>

            {/* Header Content */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Booking Details
                </h1>
                <p className="text-gray-600">
                  {isOwner ? 'Managing as Owner' : 'Viewing as Renter'} • ID: {booking.id.slice(-8).toUpperCase()}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {booking.status === 'confirmed' && (
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {booking.status === 'pending' && (
                  <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                )}
                {booking.status === 'payment_required' && (
                  <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                )}
                {booking.status === 'cancelled' && (
                  <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                )}
                {booking.status === 'completed' && (
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <Badge className={`${getStatusColor(booking.status)} px-3 py-1 text-sm font-medium`}>
                  {getStatusText(booking.status)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Item Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <Receipt className="h-4 w-4 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Item Details</h2>
                  </div>
                  
                  <div className="flex gap-6">
                    {booking.listings.images?.[0] && (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image
                          src={booking.listings.images[0]}
                          alt={booking.listings.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3 truncate">
                        {booking.listings.title}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{booking.listings.city}, {booking.listings.state}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span>Hosted by {booking.profiles.full_name}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Shield className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="capitalize">{booking.listings.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rental Period */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Rental Period</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                          <CalendarDays className="w-3 h-3 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Check-in</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {format(startDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="h-6 w-6 bg-red-100 rounded-full flex items-center justify-center mr-2">
                          <CalendarDays className="w-3 h-3 text-red-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Check-out</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {format(endDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Duration</span>
                      </div>
                      <span className="text-lg font-semibold text-blue-600">
                        {duration} day{duration !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pickup Confirmation Section */}
              {showPickupButton && (() => {
                const pickupConfig = getPickupButtonConfig();
                const ButtonIcon = pickupConfig.buttonIcon;
                
                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <Package className="h-4 w-4 text-green-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Pickup Confirmation</h2>
                      </div>
                      
                      <div className="space-y-2">
                        <Button 
                          className={`w-full font-semibold ${pickupConfig.buttonColor}`}
                          onClick={pickupConfig.buttonAction || undefined}
                          disabled={pickupConfig.isDisabled}
                        >
                          <ButtonIcon className="w-4 h-4 mr-2" />
                          {pickupConfig.pickupButtonText}
                        </Button>
                        
                        {pickupConfig.pickupButtonNote && (
                          <p className="text-xs text-gray-600 text-center">
                            {pickupConfig.pickupButtonNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Review Section */}
              {(() => {
                const renterConfirmedReturn = booking.return_confirmed_by_renter || false;
                const ownerConfirmedReturn = booking.return_confirmed_by_owner || false;
                const bothReturnConfirmed = renterConfirmedReturn && ownerConfirmedReturn;
                const canShowReview = booking.status === 'completed' || bothReturnConfirmed;
                const canLeaveReview = canShowReview && !existingReview && !reviewCheckLoading;

                if (!canShowReview) return null;

                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center mb-6">
                        <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                          <CheckCircle className="h-4 w-4 text-yellow-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Review Experience</h2>
                      </div>
                      
                      {existingReview ? (
                        /* Show existing review */
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start gap-4">
                            {/* Profile Image */}
                            {existingReview.profiles?.avatar_url ? (
                              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                  src={existingReview.profiles.avatar_url}
                                  alt={existingReview.profiles.full_name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9.049 2.927C9.349 2.019 10.651 2.019 10.951 2.927L12.424 7.257H17.034C17.955 7.257 18.298 8.373 17.576 8.943L13.988 11.479L15.461 15.809C15.761 16.717 14.853 17.476 14.131 16.906L10.5 14.37L6.869 16.906C6.147 17.476 5.239 16.717 5.539 15.809L7.012 11.479L3.424 8.943C2.702 8.373 3.045 7.257 3.966 7.257H8.576L9.049 2.927Z"/>
                                </svg>
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900">Your Review</h4>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      className={`w-5 h-5 ${
                                        star <= existingReview.rating 
                                          ? 'text-yellow-400 fill-current' 
                                          : 'text-gray-300'
                                      }`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M9.049 2.927C9.349 2.019 10.651 2.019 10.951 2.927L12.424 7.257H17.034C17.955 7.257 18.298 8.373 17.576 8.943L13.988 11.479L15.461 15.809C15.761 16.717 14.853 17.476 14.131 16.906L10.5 14.37L6.869 16.906C6.147 17.476 5.239 16.717 5.539 15.809L7.012 11.479L3.424 8.943C2.702 8.373 3.045 7.257 3.966 7.257H8.576L9.049 2.927Z"/>
                                    </svg>
                                  ))}
                                  <span className="text-base font-semibold text-gray-700 ml-2">
                                    {existingReview.rating}/5
                                  </span>
                                </div>
                              </div>
                              
                              {/* Comment */}
                              {existingReview.comment && (
                                <p className="text-gray-700 mb-3 leading-relaxed">
                                  {existingReview.comment}
                                </p>
                              )}
                              
                              {/* Date */}
                              <p className="text-sm text-gray-500">
                                Reviewed on {new Date(existingReview.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : canLeaveReview ? (
                        /* Show review button */
                        <div className="text-center">
                          <p className="text-gray-600 mb-4">
                            Your rental experience is complete! Share your review to help other renters.
                          </p>
                          <Link href={`/bookings/${booking.id}/reviews`}>
                            <button className="bg-[#44D62C] hover:bg-[#3AB827] text-white font-semibold py-3 px-6 rounded-lg flex items-center mx-auto transition-colors">
                              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.049 2.927C9.349 2.019 10.651 2.019 10.951 2.927L12.424 7.257H17.034C17.955 7.257 18.298 8.373 17.576 8.943L13.988 11.479L15.461 15.809C15.761 16.717 14.853 17.476 14.131 16.906L10.5 14.37L6.869 16.906C6.147 17.476 5.239 16.717 5.539 15.809L7.012 11.479L3.424 8.943C2.702 8.373 3.045 7.257 3.966 7.257H8.576L9.049 2.927Z"/>
                              </svg>
                              Leave a Review
                            </button>
                          </Link>
                        </div>
                      ) : (
                        /* Loading state */
                        <div className="text-center text-gray-500">
                          <div className="animate-pulse">Checking review status...</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Pickup Location & Map */}
              {booking.pickup_location && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center mb-6">
                      <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <Navigation className="h-4 w-4 text-purple-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Pickup Location</h2>
                    </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Address Details */}
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Address</p>
                          <p className="font-semibold text-gray-900">{booking.pickup_location}</p>
                        </div>
                      </div>
                      
                      {/* Delivery Method */}
                      <div className="flex items-start space-x-3">
                        <Truck className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Method</p>
                          <p className="font-semibold text-gray-900 capitalize">
                            {booking.delivery_method || 'Pickup'}
                          </p>
                        </div>
                      </div>

                      {/* Additional Delivery Address if different */}
                      {booking.delivery_address && booking.delivery_method === 'delivery' && (
                        <div className="flex items-start space-x-3">
                          <Truck className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
                            <p className="font-semibold text-gray-900">{booking.delivery_address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Map Placeholder */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Interactive map</p>
                          <p className="text-xs text-gray-400">Coming soon</p>
                        </div>
                      </div>
                      
                      {/* Map Actions */}
                      <MapActions pickupLocation={booking.pickup_location} />
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {booking.special_instructions && (
                <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
                  <div className="flex items-center mb-4">
                    <MessageCircle className="h-5 w-5 text-purple-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Special Instructions</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{booking.special_instructions}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <CreditCard className="h-4 w-4 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Payment Summary</h2>
                  </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">${booking.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="font-semibold">${booking.service_fee?.toFixed(2) || '0.00'}</span>
                  </div>
                  {booking.insurance_fee && booking.insurance_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance Fee</span>
                      <span className="font-semibold">${booking.insurance_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                  {booking.delivery_fee && booking.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-semibold">${booking.delivery_fee?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Security Deposit</span>
                    <span className="font-semibold">${booking.deposit_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-[#44D62C]">
                        ${booking.total_amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {booking.status === 'payment_required' && (
                  <div className="mt-6">
                    <Link href={`/bookings/${booking.id}/payment`} className="w-full">
                      <Button className="w-full bg-[#44D62C] hover:bg-[#3AB827] text-white font-semibold py-2 px-4 rounded-lg">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Complete Payment
                      </Button>
                    </Link>
                  </div>
                )}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Receipt className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
                  </div>
                
                <BookingActions 
                  booking={{
                    id: booking.id,
                    status: booking.status,
                    owner_id: booking.owner_id,
                    renter_id: booking.renter_id,
                    listing_id: booking.listing_id,
                    pickup_location: booking.pickup_location,
                    start_date: booking.start_date,
                    end_date: booking.end_date,
                    total_amount: booking.total_amount,
                    pickup_confirmed_by_renter: booking.pickup_confirmed_by_renter,
                    pickup_confirmed_by_owner: booking.pickup_confirmed_by_owner,
                    return_confirmed_by_renter: booking.return_confirmed_by_renter,
                    return_confirmed_by_owner: booking.return_confirmed_by_owner,
                    listings: {
                      title: booking.listings.title
                    },
                    profiles: {
                      full_name: booking.profiles.full_name
                    },
                    renter: {
                      full_name: booking.renter?.full_name || 'Unknown Renter'
                    }
                  }}
                  isOwner={isOwner}
                  userId={user.id}
                  canConfirmPickup={canConfirmPickup}
                  canReturn={canReturn}
                />
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {isOwner ? 'Your Renter' : 'Your Host'}
                    </h2>
                  </div>
                
                <div className="flex items-center gap-3">
                  {isOwner ? (
                    // Show renter info when user is owner
                    <>
                      {booking.renter?.avatar_url ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={booking.renter.avatar_url}
                            alt={booking.renter.full_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{booking.renter?.full_name}</p>
                        <p className="text-sm text-gray-500">Renter</p>
                      </div>
                    </>
                  ) : (
                    // Show host info when user is renter
                    <>
                      {booking.profiles.avatar_url ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={booking.profiles.avatar_url}
                            alt={booking.profiles.full_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{booking.profiles.full_name}</p>
                        <p className="text-sm text-gray-500">Host</p>
                      </div>
                    </>
                  )}
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}

export default function BookingPage({ params }: PageProps) {
  return <BookingDetailsContent params={params} />;
}
