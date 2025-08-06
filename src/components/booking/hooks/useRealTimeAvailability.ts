'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to manage real-time availability updates for a listing
 * Subscribes to changes in the listing_availability table and invalidates relevant queries
 */
export function useRealTimeAvailability(listingId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!listingId) return;

    const supabase = createClient();

    // Subscribe to availability changes for this listing
    const channel = supabase
      .channel(`availability-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'listing_availability',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          console.log('Availability updated for listing:', listingId, payload);
          
          // Invalidate availability queries for this listing
          queryClient.invalidateQueries({
            queryKey: ['availability', listingId],
          });
          
          // Also invalidate any related booking queries
          queryClient.invalidateQueries({
            queryKey: ['bookings'],
          });
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('Unsubscribing from availability updates for listing:', listingId);
      supabase.removeChannel(channel);
    };
  }, [listingId, queryClient]);

  // Return channel status for debugging (optional)
  return {
    // Could add channel status or other utilities here if needed
  };
}

/**
 * Hook to manage real-time booking updates that affect availability
 * Subscribes to booking changes that might impact listing availability
 */
export function useRealTimeBookings(listingId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to booking changes
    const channel = supabase
      .channel('booking-availability-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: listingId ? `listing_id=eq.${listingId}` : undefined,
        },
        (payload) => {
          console.log('Booking updated, refreshing availability:', payload);
          
          // Get the listing ID from the payload
          const affectedListingId = payload.new?.listing_id || payload.old?.listing_id;
          
          if (affectedListingId) {
            // Invalidate availability for the affected listing
            queryClient.invalidateQueries({
              queryKey: ['availability', affectedListingId],
            });
          }
          
          // Invalidate general booking queries
          queryClient.invalidateQueries({
            queryKey: ['bookings'],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId, queryClient]);
}

/**
 * Combined hook for complete real-time availability management
 * Use this in components that need both availability and booking updates
 */
export function useAvailabilitySync(listingId: string) {
  useRealTimeAvailability(listingId);
  useRealTimeBookings(listingId);
}