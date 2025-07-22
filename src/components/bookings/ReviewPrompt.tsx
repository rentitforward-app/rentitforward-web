'use client';

import React from 'react';
import { Star, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ReviewPromptProps {
  booking: {
    id: string;
    canRenterReview: boolean;
    canOwnerReview: boolean;
    userRole: 'renter' | 'owner';
    listings?: {
      title: string;
    };
  };
  onStartReview: () => void;
  className?: string;
}

export function ReviewPrompt({ booking, onStartReview, className = '' }: ReviewPromptProps) {
  const canReview = booking.userRole === 'renter' ? booking.canRenterReview : booking.canOwnerReview;
  
  if (!canReview) {
    return null;
  }

  const reviewType = booking.userRole === 'renter' ? 'owner' : 'renter';
  const actionText = booking.userRole === 'renter' 
    ? 'How was your rental experience?' 
    : 'How was your renter?';

  return (
    <Card className={`border-l-4 border-l-green-500 bg-green-50 ${className}`}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-green-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  Leave a Review
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  {actionText}
                </p>
                {booking.listings?.title && (
                  <p className="text-xs text-green-600 mt-1">
                    For: {booking.listings.title}
                  </p>
                )}
              </div>
              
              <Button
                onClick={onStartReview}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Write Review
              </Button>
            </div>
            
            <div className="mt-3 flex items-center text-xs text-green-600">
              <Clock className="w-3 h-3 mr-1" />
              Help others by sharing your experience
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Alternative compact version for smaller spaces
export function CompactReviewPrompt({ booking, onStartReview, className = '' }: ReviewPromptProps) {
  const canReview = booking.userRole === 'renter' ? booking.canRenterReview : booking.canOwnerReview;
  
  if (!canReview) {
    return null;
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Star className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Review ready!
          </span>
        </div>
        <Button
          onClick={onStartReview}
          size="sm"
          variant="outline"
          className="border-green-300 text-green-700 hover:bg-green-100"
        >
          Leave Review
        </Button>
      </div>
    </div>
  );
} 