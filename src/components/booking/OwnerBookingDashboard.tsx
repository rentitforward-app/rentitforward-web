'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OwnerBookingRequestCard, BookingRequest } from './OwnerBookingRequestCard';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  Bell,
  RefreshCw,
  Filter,
  AlertTriangle 
} from 'lucide-react';

interface OwnerDashboardStats {
  pendingBookings: number;
  totalRevenue: number;
  averageResponseTime: number;
  approvalRate: number;
}

export function OwnerBookingDashboard() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent' | 'expired'>('pending');
  const queryClient = useQueryClient();

  // Fetch pending booking requests
  const { data: bookingRequests, isLoading, error, refetch } = useQuery<BookingRequest[]>({
    queryKey: ['owner-booking-requests', filter],
    queryFn: async () => {
      const response = await fetch(`/api/owner/booking-requests?filter=${filter}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking requests');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch dashboard stats
  const { data: stats } = useQuery<OwnerDashboardStats>({
    queryKey: ['owner-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/owner/dashboard-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    },
  });

  // Approve booking mutation
  const approveMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes?: string }) => {
      const response = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve booking');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
    },
  });

  // Reject booking mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ 
      bookingId, 
      reason, 
      notes 
    }: { 
      bookingId: string; 
      reason: string; 
      notes?: string;
    }) => {
      const response = await fetch(`/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notes }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject booking');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard-stats'] });
    },
  });

  const handleApprove = async (bookingId: string, notes?: string) => {
    await approveMutation.mutateAsync({ bookingId, notes });
  };

  const handleReject = async (bookingId: string, reason: string, notes?: string) => {
    await rejectMutation.mutateAsync({ bookingId, reason, notes });
  };

  const urgentBookings = bookingRequests?.filter(booking => {
    const deadline = new Date(booking.approval_deadline);
    const hoursRemaining = (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    return hoursRemaining <= 6 && hoursRemaining > 0;
  }) || [];

  const expiredBookings = bookingRequests?.filter(booking => {
    const deadline = new Date(booking.approval_deadline);
    return new Date() > deadline;
  }) || [];

  const filteredBookings = bookingRequests?.filter(booking => {
    switch (filter) {
      case 'pending':
        return booking.status === 'pending_payment';
      case 'urgent':
        const deadline = new Date(booking.approval_deadline);
        const hoursRemaining = (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        return hoursRemaining <= 6 && hoursRemaining > 0;
      case 'expired':
        return new Date() > new Date(booking.approval_deadline);
      default:
        return true;
    }
  }) || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Requests</h1>
          <p className="text-gray-600">Manage your incoming rental requests</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">{stats.pendingBookings}</p>
                </div>
                <Bell className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Month Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${stats.totalRevenue.toFixed(0)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold">{stats.averageResponseTime}h</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approval Rate</p>
                  <p className="text-2xl font-bold">{stats.approvalRate}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Urgent Alerts */}
      {urgentBookings.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{urgentBookings.length} urgent request{urgentBookings.length !== 1 ? 's' : ''}</strong> 
            {' '}expire within 6 hours. Please respond promptly to avoid automatic cancellation.
          </AlertDescription>
        </Alert>
      )}

      {expiredBookings.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{expiredBookings.length} request{expiredBookings.length !== 1 ? 's' : ''}</strong> 
            {' '}have expired. These bookings have been automatically cancelled.
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={filter === 'pending' ? 'default' : 'ghost'}
          onClick={() => setFilter('pending')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          Pending
          {stats && stats.pendingBookings > 0 && (
            <Badge variant="secondary" className="ml-2">
              {stats.pendingBookings}
            </Badge>
          )}
        </Button>
        <Button
          variant={filter === 'urgent' ? 'default' : 'ghost'}
          onClick={() => setFilter('urgent')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          Urgent
          {urgentBookings.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {urgentBookings.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={filter === 'expired' ? 'default' : 'ghost'}
          onClick={() => setFilter('expired')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          Expired
          {expiredBookings.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {expiredBookings.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilter('all')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
        >
          All Requests
        </Button>
      </div>

      {/* Booking Requests List */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Loading booking requests...</p>
          </div>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load booking requests. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && filteredBookings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No booking requests
              </h3>
              <p className="text-gray-600">
                {filter === 'pending' 
                  ? 'You have no pending requests at this time.'
                  : filter === 'urgent'
                  ? 'No urgent requests requiring immediate attention.'
                  : filter === 'expired'
                  ? 'No expired requests to review.'
                  : 'No booking requests found.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {filteredBookings.map((booking) => (
          <OwnerBookingRequestCard
            key={booking.id}
            booking={booking}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={approveMutation.isPending || rejectMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}