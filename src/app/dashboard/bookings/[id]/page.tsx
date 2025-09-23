import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CalendarDays, MapPin, User, MessageCircle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import DashboardWrapper from '@/components/DashboardWrapper';

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
      profiles!renter_id (
        id,
        full_name,
        avatar_url,
        email
      )
    `)
    .eq('id', bookingId)
    .eq('owner_id', userId)
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
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
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
    redirect('/login?redirectTo=' + encodeURIComponent(`/dashboard/bookings/${resolvedParams.id}`));
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
        return 'Pending Your Approval';
      case 'payment_required':
        return 'Waiting for Payment';
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

  return (
    <DashboardWrapper>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Booking</h1>
        <div className="flex items-center gap-4">
          <Badge className={getStatusColor(booking.status)}>
            {getStatusText(booking.status)}
          </Badge>
          <span className="text-sm text-gray-500">
            Booking ID: {booking.id}
          </span>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing Info */}
            <Card className="p-6">
              <div className="flex gap-4">
                {booking.listings.images?.[0] && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={booking.listings.images[0]}
                      alt={booking.listings.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {booking.listings.title}
                  </h2>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">
                      {booking.listings.city}, {booking.listings.state}
                    </span>
                  </div>
                  <Link 
                    href={`/listings/${booking.listing_id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Listing →
                  </Link>
                </div>
              </div>
            </Card>

            {/* Booking Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rental Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <CalendarDays className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">
                      {startDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">
                      {endDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{duration} day{duration !== 1 ? 's' : ''}</p>
              </div>
            </Card>

            {/* Pickup Information */}
            {booking.pickup_location && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pickup Details</h3>
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Pickup Location</p>
                    <p className="font-medium">{booking.pickup_location}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Renter Message */}
            {booking.renter_message && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Message from Renter</h3>
                <p className="text-gray-700">{booking.renter_message}</p>
              </Card>
            )}

            {/* Booking Actions */}
            {booking.status === 'pending' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Required</h3>
                <p className="text-gray-600 mb-4">
                  This booking request is waiting for your approval. Review the details and decide whether to approve or decline.
                </p>
                <div className="flex gap-3">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Booking
                  </Button>
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline Booking
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Payment Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rental Amount</span>
                  <span>${booking.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee</span>
                  <span className="text-red-600">-${booking.service_fee?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Your Earnings</span>
                    <span>${((booking.subtotal || 0) - (booking.service_fee || 0)).toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Payment will be released after successful rental completion
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <Link href={`/messages?with=${booking.renter_id}&booking=${booking.id}`} className="w-full">
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message Renter
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Renter Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Renter</h3>
              <div className="flex items-center gap-3">
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
                  <p className="font-medium text-gray-900">{booking.profiles.full_name}</p>
                  <p className="text-sm text-gray-500">Renter</p>
                </div>
              </div>
            </Card>

            {/* Security Deposit Info */}
            {booking.deposit_amount && booking.deposit_amount > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Deposit</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Held</span>
                    <span className="font-medium">${booking.deposit_amount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    This amount is held in escrow and will be refunded to the renter after successful item return, unless damages are reported.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
    </DashboardWrapper>
  );
}

export default function DashboardBookingPage({ params }: PageProps) {
  return (
    <Suspense fallback={<BookingDetailsSkeleton />}>
      <BookingDetailsContent params={params} />
    </Suspense>
  );
}
