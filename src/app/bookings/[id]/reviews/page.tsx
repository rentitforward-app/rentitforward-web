'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ReviewForm, ReviewList, ReviewStats } from '@/components/reviews';
import { useBookingReviews, useCreateReview, useReviewEligibility } from '@/hooks/use-reviews';
import { ReviewType, type CreateReview } from '@/shared';

export default function BookingReviewsPage() {
  const params = useParams();
  const bookingId = params.id as string;
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewType, setReviewType] = useState<ReviewType | null>(null);

  const { data: bookingData, isLoading } = useBookingReviews(bookingId);
  const {
    canRenterReview,
    canOwnerReview,
    userRole,
    existingReviews
  } = useReviewEligibility(bookingId);
  
  const createReview = useCreateReview();

  const handleCreateReview = async (data: CreateReview) => {
    try {
      await createReview.mutateAsync(data);
      setShowReviewForm(false);
      setReviewType(null);
    } catch (error) {
      console.error('Failed to create review:', error);
      throw error;
    }
  };

  const openReviewForm = (type: ReviewType) => {
    setReviewType(type);
    setShowReviewForm(true);
  };

  const closeReviewForm = () => {
    setShowReviewForm(false);
    setReviewType(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <p className="text-gray-600">The booking you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const { reviews, booking } = bookingData;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Reviews</h1>
        <p className="text-gray-600">
          Review your rental experience and see what others have said.
        </p>
      </div>

      {/* Review Actions */}
      {booking.status === 'completed' && (canRenterReview || canOwnerReview) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-3">
            Share Your Experience
          </h2>
          <p className="text-blue-700 mb-4">
            Your rental has been completed. Help the community by sharing your experience.
          </p>
          <div className="space-x-3">
            {canRenterReview && (
              <button
                onClick={() => openReviewForm(ReviewType.RENTER_TO_OWNER)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Review Owner
              </button>
            )}
            {canOwnerReview && (
              <button
                onClick={() => openReviewForm(ReviewType.OWNER_TO_RENTER)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Review Renter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && reviewType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ReviewForm
              bookingId={bookingId}
              reviewType={reviewType}
              revieweeName={
                reviewType === ReviewType.RENTER_TO_OWNER 
                  ? 'Owner Name' // This would come from booking data
                  : 'Renter Name'
              }
              listingTitle="Sample Listing Title" // This would come from booking data
              onSubmit={handleCreateReview}
              onCancel={closeReviewForm}
              isSubmitting={createReview.isPending}
            />
          </div>
        </div>
      )}

      {/* Review Statistics */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ReviewStats reviews={reviews} />
          </div>
          <div className="lg:col-span-2">
            <ReviewList
              reviews={reviews}
              currentUserId="current-user-id" // This would come from auth context
              showBookingInfo={false}
              showFilters={reviews.length > 3}
              emptyMessage="No reviews for this booking yet."
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {reviews.length === 0 && !canRenterReview && !canOwnerReview && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 8h10m0 0V18a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h6a2 2 0 012 2v2m0 0l-3-3m0 0l-3 3M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-600">
            {booking.status === 'completed' 
              ? 'This booking has been completed but no reviews have been submitted yet.'
              : 'Reviews will be available once the booking is completed.'
            }
          </p>
        </div>
      )}

      {/* Booking Status Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Booking Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
              booking.status === 'completed' 
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {booking.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Your Role:</span>
            <span className="ml-2 capitalize">{userRole}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 