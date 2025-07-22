'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  CreateReviewSchema, 
  ReviewType, 
  ReviewTag, 
  type CreateReview,
  getReviewTagLabel,
  getReviewTagColor
} from '@/shared';

interface ReviewFormProps {
  bookingId: string;
  reviewType: ReviewType;
  revieweeName: string;
  listingTitle: string;
  onSubmit: (data: CreateReview) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const availableTags = Object.values(ReviewTag);

export function ReviewForm({
  bookingId,
  reviewType,
  revieweeName,
  listingTitle,
  onSubmit,
  onCancel,
  isSubmitting = false
}: ReviewFormProps) {
  const [selectedTags, setSelectedTags] = useState<ReviewTag[]>([]);
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CreateReview>({
    resolver: zodResolver(CreateReviewSchema),
    defaultValues: {
      bookingId,
      type: reviewType,
      rating: 5,
      comment: '',
      tags: [],
      isPublic: true,
      detailedRatings: {
        communication: 5,
        reliability: 5,
        cleanliness: 5,
        accuracy: 5,
        experience: 5
      }
    }
  });

  const rating = watch('rating');
  const comment = watch('comment');

  const handleTagToggle = (tag: ReviewTag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : selectedTags.length < 5
        ? [...selectedTags, tag]
        : selectedTags;
    
    setSelectedTags(newTags);
    setValue('tags', newTags);
  };

  const handleRatingChange = (newRating: number) => {
    setValue('rating', newRating);
  };

  const onFormSubmit = async (data: CreateReview) => {
    try {
      await onSubmit({
        ...data,
        tags: selectedTags
      });
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const isRenterReview = reviewType === ReviewType.RENTER_TO_OWNER;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isRenterReview ? 'Review Owner' : 'Review Renter'}
        </h2>
        <p className="text-gray-600">
          Share your experience with <span className="font-medium">{revieweeName}</span> for 
          "<span className="font-medium">{listingTitle}</span>"
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Overall Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Overall Rating *
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingChange(star)}
                className={`text-2xl ${
                  star <= rating 
                    ? 'text-yellow-400' 
                    : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600">
              {rating}/5 stars
            </span>
          </div>
          {errors.rating && (
            <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Written Review
          </label>
          <textarea
            {...register('comment')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            placeholder="Share details about your experience..."
          />
          <div className="mt-1 flex justify-between">
            {errors.comment && (
              <p className="text-sm text-red-600">{errors.comment.message}</p>
            )}
            <p className="text-sm text-gray-500">
              {comment?.length || 0}/1000 characters
            </p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Tags (optional, max 5)
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const colorType = getReviewTagColor(tag);
              
              const buttonClasses = `
                px-3 py-1 rounded-full text-sm border transition-colors
                ${isSelected 
                  ? colorType === 'positive' 
                    ? 'bg-green-100 border-green-300 text-green-800'
                    : colorType === 'negative'
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : 'bg-yellow-100 border-yellow-300 text-yellow-800'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }
              `.trim();

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  disabled={!isSelected && selectedTags.length >= 5}
                  className={buttonClasses}
                >
                  {getReviewTagLabel(tag)}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {selectedTags.length}/5 tags selected
          </p>
        </div>

        {/* Detailed Ratings Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetailedRatings(!showDetailedRatings)}
            className="flex items-center text-sm text-green-600 hover:text-green-700"
          >
            <span>{showDetailedRatings ? '−' : '+'}</span>
            <span className="ml-1">Detailed Ratings (optional)</span>
          </button>
        </div>

        {/* Detailed Ratings */}
        {showDetailedRatings && (
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            {[
              { key: 'communication', label: 'Communication' },
              { key: 'reliability', label: 'Reliability' },
              { key: 'cleanliness', label: isRenterReview ? 'Item Cleanliness' : 'Care of Item' },
              { key: 'accuracy', label: isRenterReview ? 'Listing Accuracy' : 'As Expected' },
              { key: 'experience', label: 'Overall Experience' }
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setValue(`detailedRatings.${key}` as any, star)}
                      className={`text-lg ${
                        star <= (watch(`detailedRatings.${key}` as any) || 0)
                          ? 'text-yellow-400' 
                          : 'text-gray-300'
                      } hover:text-yellow-400 transition-colors`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Setting */}
        <div className="flex items-center">
          <input
            {...register('isPublic')}
            type="checkbox"
            id="isPublic"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
            Make this review public (recommended)
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 