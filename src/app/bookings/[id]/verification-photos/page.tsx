'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft,
  Images,
  FileText,
  User,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import DashboardWrapper from '@/components/DashboardWrapper';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getBookingVerificationData(bookingId: string, userId: string) {
  const supabase = createClient();
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      owner_id,
      renter_id,
      pickup_images,
      return_images,
      damage_report,
      damage_reported_by,
      damage_reported_at,
      owner_notes,
      listings!listing_id (
        id,
        title
      ),
      profiles:owner_id (
        id,
        full_name,
        avatar_url
      ),
      renter:renter_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error) {
    console.error('Error fetching booking:', error);
    return null;
  }

  // Check if user has access to this booking
  if (booking.owner_id !== userId && booking.renter_id !== userId) {
    return null;
  }

  return booking;
}

export default function VerificationPhotosPage({ params }: PageProps) {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          router.push('/auth/login');
          return;
        }

        setUser(currentUser);
        const resolvedParams = await params;
        const bookingData = await getBookingVerificationData(resolvedParams.id, currentUser.id);
        
        if (!bookingData) {
          setError('Booking not found or access denied');
          return;
        }

        setBooking(bookingData);
      } catch (err) {
        console.error('Error loading verification data:', err);
        setError('Failed to load verification data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params, router]);

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
        </div>
      </DashboardWrapper>
    );
  }

  if (error || !booking) {
    return (
      <DashboardWrapper>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Booking not found'}
            </h1>
            <p className="text-gray-600 mb-6">
              The verification data you're looking for could not be found.
            </p>
            <Link href="/bookings">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
          </div>
        </div>
      </DashboardWrapper>
    );
  }

  const isOwner = user?.id === booking.owner_id;
  const pickupImages = booking.pickup_images || [];
  const returnImages = booking.return_images || [];
  const hasPickupImages = pickupImages.length > 0;
  const hasReturnImages = returnImages.length > 0;
  const hasDamageReport = booking.damage_report;
  const hasOwnerNotes = booking.owner_notes;

  return (
    <DashboardWrapper>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={`/bookings/${booking.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Booking
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Verification Photos & Reports
              </h1>
              <p className="text-gray-600">
                {booking.listings?.title}
              </p>
            </div>
          </div>
        </div>

        {/* Pickup Verification Photos */}
        {hasPickupImages && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Images className="w-5 h-5 mr-2 text-green-600" />
                Pickup Verification Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pickupImages.map((photo: any, index: number) => (
                  <div key={`pickup-${photo.id || index}`} className="space-y-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={photo.url}
                        alt="Pickup verification photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {photo.user_type === 'owner' ? 'Owner' : 'Renter'}
                        </span>
                        {photo.uploaded_at && (
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(new Date(photo.uploaded_at), 'MMM d, HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Return Verification Photos */}
        {hasReturnImages && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Images className="w-5 h-5 mr-2 text-blue-600" />
                Return Verification Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {returnImages.map((photo: any, index: number) => (
                  <div key={`return-${photo.id || index}`} className="space-y-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={photo.url}
                        alt="Return verification photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {photo.user_type === 'owner' ? 'Owner' : 'Renter'}
                        </span>
                        {photo.uploaded_at && (
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(new Date(photo.uploaded_at), 'MMM d, HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Damage Reports */}
        {(hasDamageReport || hasOwnerNotes) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-orange-600" />
                Damage & Issue Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasDamageReport && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-900 mb-1">
                        Renter Damage Report
                      </h4>
                      <p className="text-orange-800 text-sm mb-2">
                        {booking.damage_report}
                      </p>
                      {booking.damage_reported_at && (
                        <p className="text-orange-600 text-xs">
                          Reported on {format(new Date(booking.damage_reported_at), 'MMM d, yyyy \'at\' HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {hasOwnerNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">
                        Owner Notes
                      </h4>
                      <p className="text-blue-800 text-sm">
                        {booking.owner_notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Data Message */}
        {!hasPickupImages && !hasReturnImages && !hasDamageReport && !hasOwnerNotes && (
          <Card>
            <CardContent className="text-center py-12">
              <Images className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Verification Data Available
              </h3>
              <p className="text-gray-600">
                No verification photos or reports have been uploaded for this booking yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardWrapper>
  );
}
