'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  type ReviewWithUser,
  getReviewTagLabel,
  getReviewTagColor,
  ReviewType
} from '@/shared';
import { 
  reviewFormatting, 
  reviewDisplay 
} from '@/shared';
import { ReviewResponse } from './ReviewResponse';

interface ReviewCardProps {
  review: ReviewWithUser;
  currentUserId?: string;
  showBookingInfo?: boolean;
  onEdit?: (review: ReviewWithUser) => void;
  onDelete?: (reviewId: string) => void;
  onRespond?: (reviewId: string) => void;
}

export function ReviewCard({
  review,
  currentUserId,
  showBookingInfo = false,
  onEdit,
  onDelete,
  onRespond
}: ReviewCardProps) {
  const [showFullComment, setShowFullComment] = useState(false);
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);

  const isReviewer = currentUserId === review.reviewerId;
  const isReviewee = currentUserId === review.revieweeId;
  const canEdit = isReviewer && onEdit;
  const canDelete = isReviewer && onDelete;
  const canRespond = isReviewee && onRespond && !review.response;

  const tagsByColor = reviewDisplay.getTagsByColor(review.tags);
  const hasDetailedRatings = reviewDisplay.shouldShowDetailedRatings(review);

  const comment = review.comment || '';
  const shouldTruncate = comment.length > 150;
  const displayComment = showFullComment ? comment : reviewFormatting.truncateComment(comment);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10">
            {review.reviewer.avatar ? (
              <Image
                src={review.reviewer.avatar}
                alt={review.reviewer.name}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {review.reviewer.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{review.reviewer.name}</h4>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{reviewFormatting.formatRelativeTime(review.createdAt)}</span>
              {review.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {(canEdit || canDelete || canRespond) && (
          <div className="flex space-x-2">
            {canEdit && (
              <button
                onClick={() => onEdit!(review)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete!(review.id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
            {canRespond && (
              <button
                onClick={() => onRespond!(review.id)}
                className="text-sm text-green-600 hover:text-green-700"
              >
                Respond
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center space-x-2 mb-3">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-lg ${
                star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {reviewFormatting.formatRating(review.rating)}/5
        </span>
        <span className="text-sm text-gray-500">
          {reviewDisplay.getReviewTypeLabel(review.type)}
        </span>
      </div>

      {/* Booking Info */}
      {showBookingInfo && (
        <div className="mb-3 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Booking:</span> {review.booking.listingTitle}
          </p>
          <p className="text-sm text-gray-500">
            {reviewFormatting.formatDate(review.booking.startDate)} - {reviewFormatting.formatDate(review.booking.endDate)}
          </p>
        </div>
      )}

      {/* Comment */}
      {comment && (
        <div className="mb-4">
          <p className="text-gray-800 leading-relaxed">
            {displayComment}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setShowFullComment(!showFullComment)}
              className="mt-1 text-sm text-green-600 hover:text-green-700"
            >
              {showFullComment ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Tags */}
      {review.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {/* Positive tags */}
            {tagsByColor.positive.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200"
              >
                {getReviewTagLabel(tag)}
              </span>
            ))}
            {/* Neutral tags */}
            {tagsByColor.neutral.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-200"
              >
                {getReviewTagLabel(tag)}
              </span>
            ))}
            {/* Negative tags */}
            {tagsByColor.negative.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full border border-red-200"
              >
                {getReviewTagLabel(tag)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Ratings */}
      {hasDetailedRatings && (
        <div className="mb-4">
          <button
            onClick={() => setShowDetailedRatings(!showDetailedRatings)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
          >
            <span>{showDetailedRatings ? '−' : '+'}</span>
            <span className="ml-1">Detailed Ratings</span>
          </button>
          
          {showDetailedRatings && review.detailedRatings && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(review.detailedRatings).map(([key, rating]) => {
                if (!rating) return null;
                
                const label = {
                  communication: 'Communication',
                  reliability: 'Reliability',
                  cleanliness: review.type === ReviewType.RENTER_TO_OWNER ? 'Item Cleanliness' : 'Care of Item',
                  accuracy: review.type === ReviewType.RENTER_TO_OWNER ? 'Listing Accuracy' : 'As Expected',
                  experience: 'Overall Experience'
                }[key] || key;

                return (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 capitalize">{label}:</span>
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-xs ${
                              star <= rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-500">{rating}/5</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Response Section */}
      <ReviewResponse
        reviewId={review.id}
        revieweeId={review.revieweeId}
        existingResponse={review.response}
      />
    </div>
  );
} 