'use client';

import React, { useState } from 'react';
import {
  useBooking,
  useUserBookings,
  useCreateBooking,
  useCancelBooking,
  useModifyBookingDates,
  useOwnerBookingActions,
  useBookingAnalytics
} from '@/hooks/graphql/useBookingManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { formatPrice, formatDate } from '@rentitforward/shared/utils/formatting';

interface BookingManagerProps {
  bookingId?: string;
  userId?: string;
  isOwnerView?: boolean;
}

/**
 * Comprehensive Booking Management Component using GraphQL
 * Demonstrates complex business logic with real-time updates
 */
export function GraphQLBookingManager({ bookingId, userId, isOwnerView = false }: BookingManagerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'calendar' | 'analytics'>('overview');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // GraphQL hooks
  const { booking, loading: bookingLoading, canModify, canCancel } = useBooking(bookingId || '');
  const { bookings, loading: bookingsLoading, totalCount } = useUserBookings(userId, {
    status: selectedStatus === 'all' ? undefined : selectedStatus
  });
  const { createNewBooking, loading: createLoading } = useCreateBooking();
  const { cancelUserBooking, loading: cancelLoading } = useCancelBooking();
  const { modifyBookingDates, loading: modifyLoading } = useModifyBookingDates();
  const { approveUserBooking, rejectUserBooking, loading: ownerActionLoading } = useOwnerBookingActions();
  const { analytics, loading: analyticsLoading } = useBookingAnalytics();

  if (bookingId && bookingLoading) {
    return <BookingDetailsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isOwnerView ? 'Booking Management Dashboard' : 'My Bookings'}
          </h1>
          <p className="text-gray-600">
            {isOwnerView 
              ? 'Manage incoming booking requests and reservations'
              : 'View and manage your rental bookings'
            }
          </p>
        </div>
        
        {!isOwnerView && (
          <Button onClick={() => window.location.href = '/browse'}>
            + Book New Rental
          </Button>
        )}
      </div>

      {/* Single Booking Details */}
      {bookingId && booking && (
        <BookingDetailsCard 
          booking={booking}
          canModify={canModify}
          canCancel={canCancel}
          isOwnerView={isOwnerView}
          onCancel={cancelUserBooking}
          onModify={modifyBookingDates}
          onApprove={approveUserBooking}
          onReject={rejectUserBooking}
          loading={cancelLoading || modifyLoading || ownerActionLoading}
        />
      )}

      {/* Booking Management Tabs */}
      {!bookingId && (
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({totalCount})</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            {isOwnerView && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <BookingOverview 
              bookings={bookings}
              isOwnerView={isOwnerView}
              analytics={analytics}
            />
          </TabsContent>

          {/* Bookings List Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <BookingsList 
              bookings={bookings}
              loading={bookingsLoading}
              isOwnerView={isOwnerView}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
            />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <BookingCalendar bookings={bookings} />
          </TabsContent>

          {/* Analytics Tab (Owner Only) */}
          {isOwnerView && (
            <TabsContent value="analytics" className="space-y-4">
              <BookingAnalytics 
                analytics={analytics}
                loading={analyticsLoading}
              />
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* GraphQL Demo Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">🚀 GraphQL Booking Management Features</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Complex Business Logic:</h4>
              <ul className="space-y-1 text-sm">
                <li>✅ Multi-step booking creation with payment integration</li>
                <li>✅ Real-time status updates and notifications</li>
                <li>✅ Dynamic pricing calculations with discounts</li>
                <li>✅ Conflict detection and availability checking</li>
                <li>✅ Automated refund processing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Advanced Features:</h4>
              <ul className="space-y-1 text-sm">
                <li>🔄 Real-time booking updates via subscriptions</li>
                <li>📊 Analytics dashboard with revenue insights</li>
                <li>📅 Interactive calendar with availability</li>
                <li>💬 Integrated messaging system</li>
                <li>🔍 Advanced filtering and search</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Booking Details Card
function BookingDetailsCard({ 
  booking, 
  canModify, 
  canCancel, 
  isOwnerView,
  onCancel,
  onModify,
  onApprove,
  onReject,
  loading
}: any) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{booking.listing.title}</CardTitle>
            <CardDescription>
              Booking #{booking.id} • {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            {booking.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Booking Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Listing Information */}
          <div>
            <h4 className="font-semibold mb-3">Listing Details</h4>
            <div className="space-y-2">
              {booking.listing.images?.[0] && (
                <img 
                  src={booking.listing.images[0]} 
                  alt={booking.listing.title}
                  className="w-full h-40 object-cover rounded-lg"
                />
              )}
              <p className="text-sm text-gray-600">{booking.listing.description}</p>
              <p className="text-sm">
                📍 {booking.listing.location.address}, {booking.listing.location.city}
              </p>
              <p className="text-lg font-semibold text-green-600">
                {formatPrice(booking.listing.price_per_day)}/day
              </p>
            </div>
          </div>

          {/* Booking Information */}
          <div>
            <h4 className="font-semibold mb-3">Booking Information</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="font-medium">{formatDate(new Date(booking.start_date))}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out:</span>
                <span className="font-medium">{formatDate(new Date(booking.end_date))}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">
                  {Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(booking.total_amount - booking.platform_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span>{formatPrice(booking.platform_fee)}</span>
              </div>
              {booking.security_deposit > 0 && (
                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span>{formatPrice(booking.security_deposit)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span className="text-green-600">{formatPrice(booking.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">
              {isOwnerView ? 'Renter' : 'Owner'}
            </h4>
            <div className="flex items-center space-x-3">
              <img 
                src={isOwnerView ? booking.renter.avatar_url : booking.listing.owner.avatar_url} 
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-medium">
                  {isOwnerView ? booking.renter.full_name : booking.listing.owner.full_name}
                </p>
                <div className="flex items-center space-x-2">
                  {(isOwnerView ? booking.renter.verified : booking.listing.owner.verified) && (
                    <Badge variant="secondary" className="text-xs">✅ Verified</Badge>
                  )}
                  {!isOwnerView && booking.listing.owner.rating && (
                    <span className="text-sm text-gray-600">
                      ⭐ {booking.listing.owner.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <div>
              <h4 className="font-semibold mb-3">Special Requests</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {booking.special_requests}
              </p>
            </div>
          )}
        </div>

        {/* Status History */}
        {booking.status_history && booking.status_history.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Status History</h4>
            <div className="space-y-2">
              {booking.status_history.map((history: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{history.status}</Badge>
                    {history.note && <span className="text-gray-600">{history.note}</span>}
                  </div>
                  <div className="text-gray-500">
                    {formatDate(new Date(history.timestamp))} by {history.updated_by.full_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {isOwnerView && booking.status === 'pending' && (
            <>
              <Button 
                onClick={() => onApprove(booking.id)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve Booking
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onReject(booking.id, 'Owner rejected')}
                disabled={loading}
              >
                Reject Booking
              </Button>
            </>
          )}
          
          {!isOwnerView && canCancel && (
            <Button 
              variant="destructive" 
              onClick={() => setShowCancelDialog(true)}
              disabled={loading}
            >
              Cancel Booking
            </Button>
          )}
          
          {canModify && (
            <Button 
              variant="outline" 
              onClick={() => setShowModifyDialog(true)}
              disabled={loading}
            >
              Modify Dates
            </Button>
          )}
          
          <Button variant="outline">
            Contact {isOwnerView ? 'Renter' : 'Owner'}
          </Button>
          
          {booking.status === 'completed' && !booking.review && (
            <Button variant="outline">
              Leave Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Booking Overview Dashboard
function BookingOverview({ bookings, isOwnerView, analytics }: any) {
  const upcomingBookings = bookings.filter((b: any) => 
    new Date(b.start_date) > new Date() && b.status === 'confirmed'
  );
  
  const pendingBookings = bookings.filter((b: any) => b.status === 'pending');
  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{bookings.length}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{upcomingBookings.length}</div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingBookings.length}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {analytics ? formatPrice(analytics.total_revenue || 0) : '$0'}
            </div>
            <div className="text-sm text-gray-600">Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    {booking.listing.images?.[0] && (
                      <img 
                        src={booking.listing.images[0]} 
                        alt={booking.listing.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{booking.listing.title}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {booking.status}
                    </Badge>
                    <p className="text-sm font-medium mt-1">{formatPrice(booking.total_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No bookings found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Bookings List Component
function BookingsList({ bookings, loading, isOwnerView, selectedStatus, onStatusChange }: any) {
  const statusOptions = [
    { value: 'all', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'canceled', label: 'Canceled' }
  ];

  if (loading) {
    return <BookingListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedStatus === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange(option.value)}
            className="whitespace-nowrap"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Bookings Grid */}
      {bookings.length > 0 ? (
        <div className="grid gap-4">
          {bookings.map((booking: any) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {booking.listing.images?.[0] && (
                      <img 
                        src={booking.listing.images[0]} 
                        alt={booking.listing.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h4 className="font-semibold">{booking.listing.title}</h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isOwnerView ? `Renter: ${booking.renter.full_name}` : `Owner: ${booking.listing.owner.full_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'canceled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {booking.status}
                    </Badge>
                    <p className="text-lg font-semibold mt-1">{formatPrice(booking.total_amount)}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">No bookings found for the selected filter</p>
            {!isOwnerView && (
              <Button>Browse Listings</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Booking Calendar Component
function BookingCalendar({ bookings }: any) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const bookedDates = bookings
    .filter((booking: any) => booking.status === 'confirmed')
    .flatMap((booking: any) => {
      const dates = [];
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Calendar</CardTitle>
          <CardDescription>
            Green dates are booked, click a date to see details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              booked: bookedDates
            }}
            modifiersStyles={{
              booked: { backgroundColor: '#dcfce7', color: '#166534' }
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected Date Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            <div>
              <p className="text-lg font-semibold mb-4">
                {formatDate(selectedDate)}
              </p>
              
              {/* Find bookings for selected date */}
              {bookings
                .filter((booking: any) => {
                  const start = new Date(booking.start_date);
                  const end = new Date(booking.end_date);
                  return selectedDate >= start && selectedDate <= end;
                })
                .map((booking: any) => (
                  <div key={booking.id} className="border rounded p-3 mb-3">
                    <h4 className="font-medium">{booking.listing.title}</h4>
                    <p className="text-sm text-gray-600">
                      {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
                    </p>
                    <Badge className="mt-1">{booking.status}</Badge>
                  </div>
                ))}
                
              {bookings.filter((booking: any) => {
                const start = new Date(booking.start_date);
                const end = new Date(booking.end_date);
                return selectedDate >= start && selectedDate <= end;
              }).length === 0 && (
                <p className="text-gray-600">No bookings for this date</p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Select a date to view details</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Booking Analytics Component
function BookingAnalytics({ analytics, loading }: any) {
  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-600">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(analytics.total_revenue)}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analytics.total_bookings}
            </div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatPrice(analytics.average_booking_value)}
            </div>
            <div className="text-sm text-gray-600">Avg Booking Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(analytics.occupancy_rate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Occupancy Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      {analytics.revenue_by_month && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.revenue_by_month.map((month: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{month.month}</span>
                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(month.revenue)}</div>
                    <div className="text-sm text-gray-600">{month.booking_count} bookings</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Listings */}
      {analytics.top_listings && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_listings.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-gray-400">#{index + 1}</span>
                    {item.listing.images?.[0] && (
                      <img 
                        src={item.listing.images[0]} 
                        alt={item.listing.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <span className="font-medium">{item.listing.title}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(item.revenue)}</div>
                    <div className="text-sm text-gray-600">{item.booking_count} bookings</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading Skeletons
function BookingDetailsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
} 