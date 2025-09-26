'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft,
  FileText,
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import DashboardWrapper from '@/components/DashboardWrapper';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getBookingDamageReports(bookingId: string, userId: string) {
  const supabase = createClient();
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      owner_id,
      renter_id,
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

export default function DamageReportsPage({ params }: PageProps) {
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
        const bookingData = await getBookingDamageReports(resolvedParams.id, currentUser.id);
        
        if (!bookingData) {
          setError('Booking not found or access denied');
          return;
        }

        setBooking(bookingData);
      } catch (err) {
        console.error('Error loading damage reports:', err);
        setError('Failed to load damage reports');
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
              The damage reports you're looking for could not be found.
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
                Damage & Issue Reports
              </h1>
              <p className="text-gray-600">
                {booking.listings?.title}
              </p>
            </div>
          </div>
        </div>

        {/* Damage Reports */}
        {(hasDamageReport || hasOwnerNotes) ? (
          <div className="space-y-4">
            {hasDamageReport && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-700">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Renter Damage Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <User className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-orange-900 mb-2">
                            Reported by: {booking.renter?.full_name || 'Renter'}
                          </h4>
                          <div className="prose prose-sm max-w-none text-orange-800">
                            <p className="whitespace-pre-wrap">{booking.damage_report}</p>
                          </div>
                        </div>
                      </div>
                      
                      {booking.damage_reported_at && (
                        <div className="flex items-center space-x-2 text-orange-600 text-sm border-t border-orange-200 pt-3">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Reported on {format(new Date(booking.damage_reported_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasOwnerNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-700">
                    <FileText className="w-5 h-5 mr-2" />
                    Owner Notes & Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <User className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900 mb-2">
                            Notes from: {booking.profiles?.full_name || 'Owner'}
                          </h4>
                          <div className="prose prose-sm max-w-none text-blue-800">
                            <p className="whitespace-pre-wrap">{booking.owner_notes}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-700">
                  <FileText className="w-5 h-5 mr-2" />
                  Resolution Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Current Status:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === 'disputed' 
                          ? 'bg-orange-100 text-orange-800' 
                          : booking.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status === 'disputed' ? 'Under Review' : 
                         booking.status === 'completed' ? 'Resolved' : 
                         booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {booking.status === 'disputed' && (
                        <p>
                          <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-500" />
                          This booking is currently under review by our support team. 
                          We will contact both parties to resolve any damage claims or disputes.
                        </p>
                      )}
                      {booking.status === 'completed' && (
                        <p>
                          All damage reports and disputes for this booking have been resolved. 
                          The rental has been completed successfully.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Damage Reports
              </h3>
              <p className="text-gray-600">
                No damage or issues have been reported for this booking.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardWrapper>
  );
}
