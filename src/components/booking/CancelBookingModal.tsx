'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  Mail,
  User
} from 'lucide-react';
// Define cancellation reasons locally since shared package import is failing
const BookingCancellationReason = {
  // Renter reasons
  CHANGE_OF_PLANS: 'change_of_plans',
  NO_LONGER_NEED_ITEM: 'no_longer_need_item',
  FOUND_ALTERNATIVE_RENTAL: 'found_alternative_rental',
  
  // Owner reasons
  ITEM_NO_LONGER_AVAILABLE: 'item_no_longer_available',
  ITEM_DAMAGED: 'item_damaged',
  EMERGENCY_SITUATION: 'emergency_situation',
  DOUBLE_BOOKED: 'double_booked',
  
  // General reasons
  PAYMENT_FAILED: 'payment_failed',
  POLICY_VIOLATION: 'policy_violation',
  OTHER: 'other'
} as const;

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => Promise<void>;
  booking: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    owner_name: string;
    renter_name: string;
  };
  isRenter: boolean;
}

// Define role-specific cancellation reasons
const getCancellationReasons = (isRenter: boolean) => {
  if (isRenter) {
    return [
      { value: BookingCancellationReason.CHANGE_OF_PLANS, label: 'Change of plans' },
      { value: BookingCancellationReason.NO_LONGER_NEED_ITEM, label: 'No longer need the item' },
      { value: BookingCancellationReason.FOUND_ALTERNATIVE_RENTAL, label: 'Found an alternative rental' },
      { value: BookingCancellationReason.OTHER, label: 'Other reason' }
    ];
  } else {
    return [
      { value: BookingCancellationReason.ITEM_NO_LONGER_AVAILABLE, label: 'Item no longer available' },
      { value: BookingCancellationReason.ITEM_DAMAGED, label: 'Item damaged' },
      { value: BookingCancellationReason.EMERGENCY_SITUATION, label: 'Emergency situation' },
      { value: BookingCancellationReason.DOUBLE_BOOKED, label: 'Double booked' },
      { value: BookingCancellationReason.OTHER, label: 'Other reason' }
    ];
  }
};

export function CancelBookingModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  booking, 
  isRenter 
}: CancelBookingModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const now = new Date();
  const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLessThan24Hours = hoursUntilStart < 24;
  const cancellationFee = isLessThan24Hours ? booking.total_amount * 0.5 : 0;
  const refundAmount = booking.total_amount - cancellationFee;

  const handleConfirm = async () => {
    if (!selectedReason) {
      setError('Please select a cancellation reason');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onConfirm(selectedReason, note);
      onClose();
    } catch (err) {
      setError('Failed to cancel booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedReason('');
      setNote('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" data-testid="cancel-booking-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Cancel Booking</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{booking.title}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Booking Period: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                <span>Total: ${booking.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy Warning */}
          <div className={`rounded-lg p-4 ${
            isLessThan24Hours 
              ? 'bg-orange-50 border border-orange-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-start">
              <AlertTriangle className={`h-5 w-5 mr-3 mt-0.5 ${
                isLessThan24Hours ? 'text-orange-600' : 'text-green-600'
              }`} />
              <div>
                <h4 className={`font-semibold ${
                  isLessThan24Hours ? 'text-orange-800' : 'text-green-800'
                }`}>
                  {isLessThan24Hours ? 'Late Cancellation Fee' : 'Free Cancellation'}
                </h4>
                <p className={`text-sm mt-1 ${
                  isLessThan24Hours ? 'text-orange-700' : 'text-green-700'
                }`}>
                  {isLessThan24Hours 
                    ? `Cancelling less than 24 hours before pickup will result in a 50% cancellation fee ($${cancellationFee.toFixed(2)}).`
                    : 'You can cancel this booking for free since it\'s more than 24 hours before pickup.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Refund Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Refund Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Original Amount:</span>
                <span className="text-blue-700">${booking.total_amount.toFixed(2)}</span>
              </div>
              {cancellationFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Cancellation Fee:</span>
                  <span className="text-blue-700">-${cancellationFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-blue-200 pt-1">
                <span className="text-blue-800">Refund Amount:</span>
                <span className="text-blue-800">${refundAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why are you cancelling? *
            </label>
            <select
              name="reason"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={isLoading}
            >
              <option value="">Select a reason</option>
              {getCancellationReasons(isRenter).map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Note (Optional)
            </label>
            <textarea
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Let us know if there's anything else we should know..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={isLoading}
            />
          </div>

          {/* Notification Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-gray-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Notification</h4>
                <p className="text-sm text-gray-600">
                  {isRenter ? booking.owner_name : booking.renter_name} will be notified of this cancellation via email.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="px-6"
          >
            Keep Booking
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !selectedReason}
            className="bg-red-600 hover:bg-red-700 text-white px-6"
          >
            {isLoading ? 'Cancelling...' : 'Cancel Booking'}
          </Button>
        </div>
      </div>
    </div>
  );
}
