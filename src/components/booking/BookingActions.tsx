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
  const [isPickupLoading, setIsPickupLoading] = useState(false);
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

  // Calculate confirmation state (matching mobile app logic)
  const isRenter = userId === booking.renter_id;
  
  // Pickup confirmation status
  const renterConfirmedPickup = booking.pickup_confirmed_by_renter || false;
  const ownerConfirmedPickup = booking.pickup_confirmed_by_owner || false;
  const bothPickupConfirmed = renterConfirmedPickup && ownerConfirmedPickup;
  const currentUserPickupConfirmed = (isRenter && renterConfirmedPickup) || (isOwner && ownerConfirmedPickup);
  const otherPartyPickupConfirmed = (isRenter && ownerConfirmedPickup) || (isOwner && renterConfirmedPickup);
  
  // Return confirmation status
  const renterConfirmedReturn = booking.return_confirmed_by_renter || false;
  const ownerConfirmedReturn = booking.return_confirmed_by_owner || false;
  const bothReturnConfirmed = renterConfirmedReturn && ownerConfirmedReturn;
  const currentUserReturnConfirmed = (isRenter && renterConfirmedReturn) || (isOwner && ownerConfirmedReturn);
  const otherPartyReturnConfirmed = (isRenter && ownerConfirmedReturn) || (isOwner && renterConfirmedReturn);

  // Button logic (matching mobile app)
  const canReturnNew = bothPickupConfirmed && isWithinOrAfterRentalPeriod && booking.status !== 'completed' && !currentUserReturnConfirmed;
  const showPickupButton = booking.status === 'confirmed' || booking.status === 'payment_required' || canReturnNew || bothPickupConfirmed || currentUserReturnConfirmed;

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

  // Get button text and note based on complex state (matching mobile app logic)
  const getPickupButtonTextAndNote = () => {
    let pickupButtonText = '';
    let pickupButtonNote = '';
    
    // Return confirmation states (highest priority)
    if (currentUserReturnConfirmed && !otherPartyReturnConfirmed) {
      // Current user confirmed return, waiting for other party
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = `Waiting for ${otherPartyName} return confirmation`;
      pickupButtonNote = `You've confirmed the return. Waiting for the ${otherPartyName} to verify and confirm return.`;
    } else if (!currentUserReturnConfirmed && otherPartyReturnConfirmed) {
      // Other party confirmed return, current user needs to confirm
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = 'Verify Return';
      pickupButtonNote = `The ${otherPartyName} has confirmed return. Please verify the item and confirm.`;
    } else if (bothReturnConfirmed) {
      // Both confirmed return - booking completed
      pickupButtonText = 'Return Completed';
      pickupButtonNote = 'Both parties have confirmed return. The rental is now complete.';
    } 
    // Return available states
    else if (canReturnNew) {
      pickupButtonText = 'Verify Return';
      pickupButtonNote = 'The rental period is active. You can now verify and confirm the return of the item.';
    } 
    // Pickup confirmation states
    else if (bothPickupConfirmed && !canReturnNew) {
      // Both confirmed pickup but return not yet available
      pickupButtonText = 'Pickup Confirmed';
      pickupButtonNote = 'Both parties have confirmed pickup. Return verification will be available during the rental period.';
    } else if (currentUserPickupConfirmed && !otherPartyPickupConfirmed) {
      // Current user confirmed pickup, waiting for other party
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = `Waiting for ${otherPartyName} confirmation`;
      pickupButtonNote = `You've confirmed pickup. Waiting for the ${otherPartyName} to verify and confirm pickup.`;
    } else if (!currentUserPickupConfirmed && otherPartyPickupConfirmed) {
      // Other party confirmed pickup, current user needs to confirm
      const otherPartyName = isRenter ? 'owner' : 'renter';
      pickupButtonText = 'Verify Pickup';
      pickupButtonNote = `The ${otherPartyName} has confirmed pickup. Please verify the item and confirm.`;
    } 
    // Initial pickup states
    else if (isBeforePickupPeriod) {
      pickupButtonText = 'Verify Pickup (Not Available Yet)';
      const daysUntil = Math.ceil((startOfPickupPeriod.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      pickupButtonNote = `Pickup verification will be available starting ${startDate.toLocaleDateString()} at 12:00 AM (${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now)`;
    } else if (isAfterPickupPeriod && !bothPickupConfirmed) {
      pickupButtonText = 'Pickup Date Passed';
      pickupButtonNote = 'Pickup date has passed. Contact support if you need assistance.';
    } else if (isWithinPickupPeriod && booking.status !== 'confirmed') {
      pickupButtonText = 'Complete Payment First';
      pickupButtonNote = 'Complete payment first to enable pickup verification.';
    } else {
      pickupButtonText = 'Verify Pickup';
      pickupButtonNote = 'Verify the item pickup to start the rental period.';
    }

    return { pickupButtonText, pickupButtonNote };
  };

  const { pickupButtonText, pickupButtonNote } = getPickupButtonTextAndNote();

  // Get the action function (return or pickup)
  const getPickupButtonAction = () => {
    if (canReturnNew || (!currentUserReturnConfirmed && otherPartyReturnConfirmed)) {
      return handleConfirmReturn;
    }
    return handleConfirmPickup;
  };

  // Check if button should be disabled
  const isPickupButtonDisabled = () => {
    if (isBeforePickupPeriod) return true;
    if (isAfterPickupPeriod && !bothPickupConfirmed) return true;
    if (booking.status !== 'confirmed' && !bothPickupConfirmed && !canReturnNew) return true;
    if (bothReturnConfirmed) return true;
    if (currentUserPickupConfirmed && !otherPartyPickupConfirmed && !canReturnNew) return true;
    if (currentUserReturnConfirmed && !otherPartyReturnConfirmed) return true;
    return false;
  };

  return (
    <div className="space-y-3">
      {/* Main Verification Button (Pickup/Return) */}
      {showPickupButton && (
        <div className="space-y-2">
          <Button 
            className={`w-full font-semibold ${
              canReturnNew || (!currentUserReturnConfirmed && otherPartyReturnConfirmed)
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : bothReturnConfirmed 
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : currentUserPickupConfirmed || currentUserReturnConfirmed
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            onClick={getPickupButtonAction()}
            disabled={isPickupButtonDisabled()}
          >
            {canReturnNew || (!currentUserReturnConfirmed && otherPartyReturnConfirmed) ? (
              <Flag className="w-4 h-4 mr-2" />
            ) : bothReturnConfirmed ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <Package className="w-4 h-4 mr-2" />
            )}
            {pickupButtonText}
          </Button>
          
          {pickupButtonNote && (
            <p className="text-xs text-gray-600 text-center px-2">
              {pickupButtonNote}
            </p>
          )}
        </div>
      )}

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

// Separate component for pickup button
export function PickupButton({ 
  booking, 
  canConfirmPickup 
}: { 
  booking: { id: string; status: string; start_date: string; end_date: string };
  canConfirmPickup: boolean;
}) {
  const [isPickupLoading, setIsPickupLoading] = useState(false);
  
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
  const showPickupButton = booking.status === 'confirmed' || booking.status === 'payment_required';
  const sharedCanConfirmPickup = isWithinPickupPeriod && booking.status === 'confirmed';

  const handleConfirmPickup = async () => {
    setIsPickupLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/confirm-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to verify pickup. Please try again.');
      }
    } catch (error) {
      alert('Error confirming pickup. Please try again.');
    } finally {
      setIsPickupLoading(false);
    }
  };

  const getPickupButtonText = () => {
    if (isPickupLoading) return 'Verifying...';
    if (isBeforePickupPeriod) return 'Verify Pickup (Not Available Yet)';
    if (isAfterPickupPeriod) return 'Pickup Date Passed';
    return 'Verify Pickup';
  };

  const getPickupButtonNote = () => {
    if (isBeforePickupPeriod) {
      const daysUntil = Math.ceil((startOfPickupPeriod.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `Pickup button will be active starting ${startDate.toLocaleDateString()} at 12:00 AM (${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now)`;
    }
    if (isAfterPickupPeriod) {
      return 'Pickup date has passed. Contact support if you need assistance.';
    }
    if (isWithinPickupPeriod && booking.status !== 'confirmed') {
      return 'Complete payment first to enable pickup confirmation.';
    }
    return null;
  };

  if (!showPickupButton) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <Package className="h-4 w-4 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Pickup Confirmation</h2>
        </div>
        
        <Button 
          className={`w-full font-semibold ${
            sharedCanConfirmPickup 
              ? 'bg-[#44D62C] hover:bg-[#3AB827] text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          onClick={sharedCanConfirmPickup ? handleConfirmPickup : undefined}
          disabled={!sharedCanConfirmPickup || isPickupLoading}
        >
          <Package className="w-4 h-4 mr-2" />
          {getPickupButtonText()}
        </Button>
        
        {/* Pickup Button Note */}
        {getPickupButtonNote() && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            {getPickupButtonNote()}
          </p>
        )}
      </div>
    </div>
  );
}

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
