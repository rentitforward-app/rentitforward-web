import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
import { BookingActions, MapActions, PickupButton } from '@/components/booking/BookingActions';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getBookingDetails(bookingId: string, userId: string) {
  const supabase = await createClient();
  
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
  const supabase = await createClient();
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

async function BookingDetailsContent({ params }: PageProps) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login?redirectTo=' + encodeURIComponent(`/bookings/${resolvedParams.id}`));
  }

  const booking = await getBookingDetails(resolvedParams.id, user.id);
  
  if (!booking) {
    notFound();
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
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine if current user is the owner or renter
  const isOwner = booking.owner_id === user.id;
  const isRenter = booking.renter_id === user.id;
  
  // Date logic for pickup/return buttons
  const today = new Date();
  const isPickupDate = startDate.toDateString() === today.toDateString();
  const isAfterPickupDate = today > startDate;
  const canConfirmPickup = isPickupDate && booking.status === 'confirmed';
  const canReturn = isAfterPickupDate && (booking.status === 'active' || booking.status === 'picked_up');
  const hasBeenPickedUp = booking.status === 'active' || booking.status === 'picked_up';

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

              {/* Pickup Button Section */}
              <PickupButton 
                booking={{
                  id: booking.id,
                  status: booking.status,
                  start_date: booking.start_date
                }}
                canConfirmPickup={canConfirmPickup}
              />

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
                        ${(() => {
                          const subtotal = booking.subtotal || 0;
                          const serviceFee = booking.service_fee || 0;
                          const insuranceFee = booking.insurance_fee || 0;
                          const deliveryFee = booking.delivery_fee || 0;
                          const calculatedTotal = subtotal + serviceFee + insuranceFee + deliveryFee;
                          return calculatedTotal.toFixed(2);
                        })()}
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
                    start_date: booking.start_date
                  }}
                  isOwner={isOwner}
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
  return (
    <Suspense fallback={<BookingDetailsSkeleton />}>
      <BookingDetailsContent params={params} />
    </Suspense>
  );
}
