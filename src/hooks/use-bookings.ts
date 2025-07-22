import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

// Types
interface BookingUpdate {
  status?: string;
  owner_notes?: string;
  renter_notes?: string;
  return_confirmed_by_owner?: boolean;
  return_confirmed_by_renter?: boolean;
}

interface BookingWithReviewEligibility {
  id: string;
  status: string;
  renter_id: string;
  owner_id: string;
  canRenterReview: boolean;
  canOwnerReview: boolean;
  userRole: 'renter' | 'owner';
  [key: string]: any;
}

// Fetch single booking with review eligibility
export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async (): Promise<BookingWithReviewEligibility> => {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }
      const data = await response.json();
      return data.booking;
    },
    enabled: !!bookingId,
  });
}

// Fetch user's bookings
export function useBookings(filters?: { status?: string; type?: 'renter' | 'owner' }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);

      const response = await fetch(`/api/bookings?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      return data.bookings;
    },
  });
}

// Update booking status
export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, updates }: { bookingId: string; updates: BookingUpdate }) => {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update booking');
      }

      return response.json();
    },
    onSuccess: (data: any, { bookingId }: { bookingId: string; updates: BookingUpdate }) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      // Show success message based on status change
      if (data.booking.status === 'completed') {
        toast.success('Booking completed! You can now leave a review.');
      } else {
        toast.success('Booking updated successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Complete booking (owner action)
export function useCompleteBooking() {
  const updateBooking = useUpdateBooking();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      return updateBooking.mutateAsync({
        bookingId,
        updates: { status: 'completed' }
      });
    },
  });
}

// Cancel booking
export function useCancelBooking() {
  const updateBooking = useUpdateBooking();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      return updateBooking.mutateAsync({
        bookingId,
        updates: { 
          status: 'cancelled',
          ...(reason && { cancellation_reason: reason })
        }
      });
    },
  });
}

// Check review eligibility for a booking
export function useReviewEligibility(bookingId: string) {
  return useQuery({
    queryKey: ['review-eligibility', bookingId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/booking/${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to check review eligibility');
      }
      const data = await response.json();
      return data.booking;
    },
    enabled: !!bookingId,
  });
}

// Hook for booking actions based on user role and status
export function useBookingActions(booking: BookingWithReviewEligibility) {
  const updateBooking = useUpdateBooking();
  const completeBooking = useCompleteBooking();
  const cancelBooking = useCancelBooking();

  const canComplete = booking.userRole === 'owner' && booking.status === 'active';
  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const showReviewPrompt = booking.status === 'completed' && 
    (booking.canRenterReview || booking.canOwnerReview);

  return {
    // Actions
    completeBooking: () => completeBooking.mutate(booking.id),
    cancelBooking: (reason?: string) => cancelBooking.mutate({ bookingId: booking.id, reason }),
    
    // UI state
    canComplete,
    canCancel,
    showReviewPrompt,
    
    // Loading states
    isUpdating: updateBooking.isPending || completeBooking.isPending || cancelBooking.isPending,
  };
} 