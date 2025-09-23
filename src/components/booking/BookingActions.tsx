'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  Package, 
  Flag, 
  AlertTriangle, 
  MessageCircle, 
  Receipt, 
  Download,
  Navigation,
  MapPin,
  X,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { CancelBookingModal } from './CancelBookingModal';

interface BookingActionsProps {
  booking: {
    id: string;
    status: string;
    owner_id: string;
    renter_id: string;
    listing_id: string;
    pickup_location?: string;
    start_date: string;
    end_date: string;
    total_amount?: number;
    pickup_confirmed_by_renter?: boolean;
    pickup_confirmed_by_owner?: boolean;
    return_confirmed_by_renter?: boolean;
    return_confirmed_by_owner?: boolean;
    listings?: {
      title: string;
    };
    profiles?: {
      full_name: string;
    };
    renter?: {
      full_name: string;
    };
  };
  isOwner: boolean;
  userId: string;
  canConfirmPickup: boolean;
  canReturn: boolean;
}

export function BookingActions({ 
  booking, 
  isOwner, 
  userId,
  canConfirmPickup, 
  canReturn 
}: BookingActionsProps) {
  const [isReturnLoading, setIsReturnLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Calculate pickup date info with new timing (start date 00:00 to end date 23:59)
  const today = new Date();
  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  
  // Set start date to beginning of day (00:00)
  const startOfPickupPeriod = new Date(startDate);
  startOfPickupPeriod.setHours(0, 0, 0, 0);
  
  // Set end date to end of day (23:59:59)
  const endOfPickupPeriod = new Date(endDate);
  endOfPickupPeriod.setHours(23, 59, 59, 999);
  
  const isWithinPickupPeriod = today >= startOfPickupPeriod && today <= endOfPickupPeriod;
  const isBeforePickupPeriod = today < startOfPickupPeriod;
  const isAfterPickupPeriod = today > endOfPickupPeriod;
  const isWithinOrAfterRentalPeriod = today >= startOfPickupPeriod;

  // Calculate confirmation state for return button only
  const isRenter = userId === booking.renter_id;
  
  // Pickup confirmation status
  const renterConfirmedPickup = booking.pickup_confirmed_by_renter || false;
  const ownerConfirmedPickup = booking.pickup_confirmed_by_owner || false;
  const bothPickupConfirmed = renterConfirmedPickup && ownerConfirmedPickup;
  
  // Note: Pickup/Return button logic has been moved to the main booking page under the "Pickup Confirmation" section

  const handleConfirmPickup = async () => {
    // Navigate to pickup verification page instead of direct API call
    window.location.href = `/bookings/${booking.id}/pickup-verification`;
  };

  const handleConfirmReturn = async () => {
    // Navigate to return verification page instead of direct API call
    window.location.href = `/bookings/${booking.id}/return-verification`;
  };

  const handleReportIssue = () => {
    window.location.href = `/bookings/${booking.id}/report-issue`;
  };

  const handleCancelBooking = async (reason: string, note: string) => {
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note })
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel booking');
      }
    } catch (error) {
      throw error;
    }
  };

  // Check if booking can be cancelled
  const canCancel = booking.status === 'pending' || 
                   booking.status === 'confirmed' || 
                   booking.status === 'payment_required';



  return (
    <div className="space-y-3">
      {/* Note: Pickup/Return button is now in the main page under "Pickup Confirmation" section */}

      {/* Cancel Booking Button */}
      {canCancel && (
        <Button 
          variant="outline" 
          className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          onClick={() => setShowCancelModal(true)}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel Booking
        </Button>
      )}

      {/* Divider for better visual separation */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Report Button */}
      <Button 
        variant="outline" 
        className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        onClick={handleReportIssue}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Report Issue
      </Button>

      {/* Divider for better visual separation */}
      <div className="border-t border-gray-200 my-4"></div>


      {/* Existing Actions */}
      <div className="space-y-3">
        <Link href={`/messages?with=${isOwner ? booking.renter_id : booking.owner_id}&booking=${booking.id}`} className="w-full">
          <Button variant="outline" className="w-full justify-start">
            <MessageCircle className="w-4 h-4 mr-2" />
            {isOwner ? 'Message Renter' : 'Message Host'}
          </Button>
        </Link>
        
        <Link href={`/listings/${booking.listing_id}`} className="w-full">
          <Button variant="outline" className="w-full justify-start">
            <Receipt className="w-4 h-4 mr-2" />
            View Listing
          </Button>
        </Link>
        
        {(booking.status === 'confirmed' || booking.status === 'completed') && (
          <Link href={`/bookings/${booking.id}/receipt`} className="w-full">
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
          </Link>
        )}
      </div>

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelBooking}
        booking={{
          id: booking.id,
          title: booking.listings?.title || 'Unknown Item',
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount || 0,
          owner_name: booking.profiles?.full_name || 'Unknown Owner',
          renter_name: booking.renter?.full_name || 'Unknown Renter'
        }}
        isRenter={!isOwner}
      />
    </div>
  );
}

// Note: Legacy PickupButton component removed - pickup/return logic now integrated in main BookingActions component above

// Separate component for map actions
export function MapActions({ pickupLocation }: { pickupLocation: string }) {
  const handleOpenInMaps = () => {
    const address = encodeURIComponent(pickupLocation);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const handleGetDirections = () => {
    const address = encodeURIComponent(pickupLocation);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
  };

  return (
    <div className="mt-4 flex space-x-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1"
        onClick={handleOpenInMaps}
      >
        <Navigation className="h-4 w-4 mr-2" />
        Open in Maps
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1"
        onClick={handleGetDirections}
      >
        <MapPin className="h-4 w-4 mr-2" />
        Get Directions
      </Button>
    </div>
  );
}
