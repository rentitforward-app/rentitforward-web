'use client';

import React from 'react';
import { ReviewCard } from './ReviewCard';
import { ReviewFilters } from './ReviewFilters';
import { 
  type ReviewWithUser, 
  type ReviewFilter
} from '@/shared';

interface ReviewListProps {
  reviews: ReviewWithUser[];
  currentUserId?: string;
  showBookingInfo?: boolean;
  showFilters?: boolean;
  initialFilter?: Partial<ReviewFilter>;
  onFiltersChange?: (filters: Partial<ReviewFilter>) => void;
  onEdit?: (review: ReviewWithUser) => void;
  onDelete?: (reviewId: string) => void;
  onRespond?: (reviewId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ReviewList({
  reviews,
  currentUserId,
  showBookingInfo = false,
  showFilters = true,
  initialFilter = {},
  onFiltersChange,
  onEdit,
  onDelete,
  onRespond,
  isLoading = false,
  emptyMessage = 'No reviews found.'
}: ReviewListProps) {

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/6"></div>
              </div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && onFiltersChange && (
        <ReviewFilters
          initialFilters={initialFilter}
          onFiltersChange={onFiltersChange}
        />
      )}

      {/* Reviews Count */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Reviews ({reviews.length})
        </h3>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              showBookingInfo={showBookingInfo}
              onEdit={onEdit}
              onDelete={onDelete}
              onRespond={onRespond}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 8h10m0 0V18a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h6a2 2 0 012 2v2m0 0l-3-3m0 0l-3 3M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium">No reviews yet</p>
            <p className="text-gray-400 text-sm mt-1">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
} 