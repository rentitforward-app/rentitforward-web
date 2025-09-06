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
  MapPin
} from 'lucide-react';
import Link from 'next/link';

interface BookingActionsProps {
  booking: {
    id: string;
    status: string;
    owner_id: string;
    renter_id: string;
    listing_id: string;
    pickup_location?: string;
    start_date: string;
  };
  isOwner: boolean;
  canConfirmPickup: boolean;
  canReturn: boolean;
}

export function BookingActions({ 
  booking, 
  isOwner, 
  canConfirmPickup, 
  canReturn 
}: BookingActionsProps) {
  const [isPickupLoading, setIsPickupLoading] = useState(false);
  const [isReturnLoading, setIsReturnLoading] = useState(false);
  
  // Calculate pickup date info
  const startDate = new Date(booking.start_date);
  const today = new Date();
  const isPickupDate = startDate.toDateString() === today.toDateString();
  const isBeforePickupDate = today < startDate;
  const isAfterPickupDate = today > startDate;
  const showPickupButton = booking.status === 'confirmed' || booking.status === 'payment_required';

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
        alert('Failed to confirm pickup. Please try again.');
      }
    } catch (error) {
      alert('Error confirming pickup. Please try again.');
    } finally {
      setIsPickupLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    setIsReturnLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/confirm-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to confirm return. Please try again.');
      }
    } catch (error) {
      alert('Error confirming return. Please try again.');
    } finally {
      setIsReturnLoading(false);
    }
  };

  const handleReportIssue = () => {
    window.open('/contact?subject=Booking Issue&booking_id=' + booking.id, '_blank');
  };

  const getPickupButtonText = () => {
    if (isPickupLoading) return 'Confirming...';
    if (isBeforePickupDate) return 'Confirm Pickup (Not Available Yet)';
    if (isAfterPickupDate) return 'Pickup Date Passed';
    return 'Confirm Pickup';
  };

  const getPickupButtonNote = () => {
    if (isBeforePickupDate) {
      const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `Pickup button will be active on ${startDate.toLocaleDateString()} (${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now)`;
    }
    if (isAfterPickupDate) {
      return 'Pickup date has passed. Contact support if you need assistance.';
    }
    if (isPickupDate && !canConfirmPickup) {
      return 'Complete payment first to enable pickup confirmation.';
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Return Button */}
      {canReturn && (
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          onClick={handleConfirmReturn}
          disabled={isReturnLoading}
        >
          <Flag className="w-4 h-4 mr-2" />
          {isReturnLoading ? 'Confirming...' : 'Confirm Return'}
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
    </div>
  );
}

// Separate component for pickup button
export function PickupButton({ 
  booking, 
  canConfirmPickup 
}: { 
  booking: { id: string; status: string; start_date: string };
  canConfirmPickup: boolean;
}) {
  const [isPickupLoading, setIsPickupLoading] = useState(false);
  
  // Calculate pickup date info
  const startDate = new Date(booking.start_date);
  const today = new Date();
  const isPickupDate = startDate.toDateString() === today.toDateString();
  const isBeforePickupDate = today < startDate;
  const isAfterPickupDate = today > startDate;
  const showPickupButton = booking.status === 'confirmed' || booking.status === 'payment_required';

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
        alert('Failed to confirm pickup. Please try again.');
      }
    } catch (error) {
      alert('Error confirming pickup. Please try again.');
    } finally {
      setIsPickupLoading(false);
    }
  };

  const getPickupButtonText = () => {
    if (isPickupLoading) return 'Confirming...';
    if (isBeforePickupDate) return 'Confirm Pickup (Not Available Yet)';
    if (isAfterPickupDate) return 'Pickup Date Passed';
    return 'Confirm Pickup';
  };

  const getPickupButtonNote = () => {
    if (isBeforePickupDate) {
      const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `Pickup button will be active on ${startDate.toLocaleDateString()} (${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now)`;
    }
    if (isAfterPickupDate) {
      return 'Pickup date has passed. Contact support if you need assistance.';
    }
    if (isPickupDate && !canConfirmPickup) {
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
            canConfirmPickup 
              ? 'bg-[#44D62C] hover:bg-[#3AB827] text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          onClick={canConfirmPickup ? handleConfirmPickup : undefined}
          disabled={!canConfirmPickup || isPickupLoading}
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
