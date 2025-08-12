import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  MapPin,
  Calendar,
  DollarSign,
  MessageCircle,
  Clock,
  CheckCircle,
  CreditCard,
  Shield,
  Truck,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface AdminBookingDetails {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  subtotal: number;
  service_fee: number;
  deposit_amount: number | null;
  payment_status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  completed_at: string | null;
  admin_released_at: string | null;
  owner_receipt_confirmed_at: string | null;
  return_confirmed_at: string | null;
  listing: {
    id: string;
    title: string;
    category: string;
    price: number;
    images: string[];
    location: {
      city: string;
      state: string;
    };
  };
  owner: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    last_login: string | null;
    stripe_account_id: string | null;
  };
  renter: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    last_login: string | null;
    stripe_customer_id: string | null;
  };
}

async function getAdminBookingDetails(bookingId: string): Promise<AdminBookingDetails | null> {
  const supabase = await createClient();
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      listing:listings!inner (
        id,
        title,
        category,
        price,
        images,
        location
      ),
      owner:profiles!bookings_owner_id_fkey (
        id,
        full_name,
        email,
        phone,
        avatar_url,
        created_at,
        last_login,
        stripe_account_id
      ),
      renter:profiles!bookings_renter_id_fkey (
        id,
        full_name,
        email,
        phone,
        avatar_url,
        created_at,
        last_login,
        stripe_customer_id
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    return null;
  }

  return booking;
}

async function getAdminUserPermissions(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role === 'admin';
}

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const isAdmin = await getAdminUserPermissions(user.id);
  if (!isAdmin) {
    notFound();
  }

  const booking = await getAdminBookingDetails(resolvedParams.id);
  if (!booking) {
    notFound();
  }

  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'payment_confirmed':
        return 'Payment Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate financial breakdown
  const platformCommission = booking.service_fee;
  const ownerPayout = booking.subtotal - platformCommission;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Booking Detail
            </h1>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(booking.status)}>
                {getStatusText(booking.status)}
              </Badge>
              <span className="text-sm text-gray-500">
                Booking ID: {resolvedParams.id}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/payment-releases">
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Payment Releases
              </Button>
            </Link>
            <Link href="/admin/bookings">
              <Button variant="outline">
                Back to Bookings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Listing Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Listing Details</h3>
            <div className="flex gap-4">
              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                {booking.listing.images && booking.listing.images.length > 0 ? (
                  <Image
                    src={booking.listing.images[0]}
                    alt={booking.listing.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{booking.listing.title}</h4>
                <p className="text-sm text-gray-600">Category: {booking.listing.category}</p>
                <p className="text-sm text-gray-600">
                  Location: {booking.listing.location.city}, {booking.listing.location.state}
                </p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  {formatPrice(booking.listing.price)}/day
                </p>
              </div>
            </div>
          </Card>

          {/* Financial Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal ({duration} days)</span>
                <span className="font-medium">{formatPrice(booking.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Service Fee</span>
                <span className="font-medium">{formatPrice(booking.service_fee)}</span>
              </div>
              {booking.deposit_amount && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-medium">{formatPrice(booking.deposit_amount)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Charged</span>
                  <span>{formatPrice(booking.total_amount)}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg mt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Owner Payout</span>
                  <span className="font-medium text-green-600">{formatPrice(ownerPayout)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Platform Commission</span>
                  <span className="font-medium">{formatPrice(platformCommission)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Owner Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner Details</h3>
            <div className="flex items-center gap-3 mb-4">
              {booking.owner.avatar_url ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={booking.owner.avatar_url}
                    alt={booking.owner.full_name}
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
                <p className="font-semibold text-gray-900">{booking.owner.full_name}</p>
                <p className="text-sm text-gray-500">{booking.owner.email}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span>{booking.owner.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member Since:</span>
                <span>{formatDateTime(booking.owner.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stripe Account:</span>
                <span className={booking.owner.stripe_account_id ? 'text-green-600' : 'text-red-600'}>
                  {booking.owner.stripe_account_id ? '✓ Yes' : '✗ No'}
                </span>
              </div>
            </div>
            
            <Link href={`/messages?with=${booking.owner.id}&booking=${resolvedParams.id}`} className="w-full mt-4 block">
              <Button variant="outline" className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Owner
              </Button>
            </Link>
          </Card>

          {/* Admin Actions */}
          {booking.status === 'completed' && !booking.admin_released_at && booking.owner.stripe_account_id && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
              <div className="space-y-3">
                <Link href={`/api/admin/release-funds/${resolvedParams.id}`} className="w-full block">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Release Funds to Owner
                  </Button>
                </Link>
                <p className="text-xs text-gray-500">
                  This will transfer {formatPrice(ownerPayout)} to the owner's Stripe account.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}