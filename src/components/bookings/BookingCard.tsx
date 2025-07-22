'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  User,
  MessageCircle,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReviewPrompt, CompactReviewPrompt } from './ReviewPrompt';
import { useBookingActions } from '@/hooks/use-bookings';
import { ReviewForm } from '@/components/reviews/ReviewForm';

interface BookingCardProps {
  booking: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    renter_id: string;
    owner_id: string;
    canRenterReview?: boolean;
    canOwnerReview?: boolean;
    userRole?: 'renter' | 'owner';
    listings?: {
      title: string;
      images: string[];
      category: string;
      price_per_day: number;
    };
    profiles?: {
      full_name: string;
      avatar_url?: string;
    };
    owner_profile?: {
      full_name: string;
      avatar_url?: string;
    };
  };
  onViewDetails?: (bookingId: string) => void;
  onMessage?: (bookingId: string) => void;
}

export function BookingCard({ booking, onViewDetails, onMessage }: BookingCardProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const bookingActions = useBookingActions(booking as any);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusIcons = {
    pending: Clock,
    confirmed: CheckCircle,
    active: CheckCircle,
    completed: CheckCircle,
    cancelled: AlertCircle,
  };

  const StatusIcon = statusIcons[booking.status as keyof typeof statusIcons] || AlertCircle;

  const otherParty = booking.userRole === 'renter' 
    ? booking.owner_profile 
    : booking.profiles;

  const handleStartReview = () => {
    setShowReviewForm(true);
  };

  const handleReviewComplete = () => {
    setShowReviewForm(false);
    // Refresh booking data to update review status
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-6">
          {/* Header with listing info */}
          <div className="flex items-start space-x-4 mb-4">
            {booking.listings?.images?.[0] && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={booking.listings.images[0]}
                  alt={booking.listings.title || 'Listing'}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {booking.listings?.title || 'Booking'}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status as keyof typeof statusColors]}`}>
                  <StatusIcon className="w-3 h-3 inline mr-1" />
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
              
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  ${booking.total_amount}
                </div>
              </div>
            </div>
          </div>

          {/* Other party info */}
          {otherParty && (
            <div className="flex items-center space-x-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {otherParty.avatar_url ? (
                  <Image
                    src={otherParty.avatar_url}
                    alt={otherParty.full_name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {booking.userRole === 'renter' ? 'Owner' : 'Renter'}: {otherParty.full_name}
                </p>
              </div>
            </div>
          )}

          {/* Review prompt for completed bookings */}
          {bookingActions.showReviewPrompt && booking.canRenterReview !== undefined && booking.canOwnerReview !== undefined && (
            <CompactReviewPrompt
              booking={{
                ...booking,
                canRenterReview: booking.canRenterReview || false,
                canOwnerReview: booking.canOwnerReview || false,
                userRole: booking.userRole || 'renter'
              }}
              onStartReview={handleStartReview}
              className="mb-4"
            />
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex space-x-2">
              {bookingActions.canComplete && (
                <Button
                  onClick={bookingActions.completeBooking}
                  disabled={bookingActions.isUpdating}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark Completed
                </Button>
              )}
              
              {bookingActions.canCancel && (
                <Button
                  onClick={() => bookingActions.cancelBooking()}
                  disabled={bookingActions.isUpdating}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex space-x-2">
              {onMessage && (
                <Button
                  onClick={() => onMessage(booking.id)}
                  variant="outline"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Message
                </Button>
              )}
              
              {onViewDetails && (
                <Button
                  onClick={() => onViewDetails(booking.id)}
                  variant="outline"
                  size="sm"
                >
                  View Details
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Leave a Review</h2>
                <Button
                  onClick={() => setShowReviewForm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
              
              <div className="text-center p-4">
                <p className="text-gray-600 mb-4">
                  Review form integration coming soon!
                </p>
                <p className="text-sm text-gray-500">
                  Booking ID: {booking.id}
                </p>
                <p className="text-sm text-gray-500">
                  Review Type: {booking.userRole === 'renter' ? 'Owner Review' : 'Renter Review'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 