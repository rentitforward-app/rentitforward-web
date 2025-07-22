'use client';

import React from 'react';
import { 
  type ReviewStats as ReviewStatsType,
  type Review,
  getReviewTagLabel,
  getReviewTagColor
} from '@/shared';
import { 
  reviewStats, 
  reviewFormatting, 
  reviewDisplay 
} from '@/shared';

interface ReviewStatsProps {
  reviews: Review[];
  className?: string;
  showDetailed?: boolean;
}

export function ReviewStats({ 
  reviews, 
  className = '',
  showDetailed = true 
}: ReviewStatsProps) {
  const stats = reviewStats.generateReviewStats(reviews);

  if (reviews.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-500">No reviews yet</p>
      </div>
    );
  }

  const ratingColor = reviewDisplay.getRatingColor(stats.averageRating);
  const ratingEmoji = reviewDisplay.getRatingEmoji(stats.averageRating);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Overall Rating */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="text-4xl font-bold text-gray-900">
            {reviewFormatting.formatRating(stats.averageRating)}
          </span>
          <span className="text-2xl">{ratingEmoji}</span>
        </div>
        <div className="flex items-center justify-center space-x-1 mb-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-xl ${
                star <= Math.round(stats.averageRating) 
                  ? 'text-yellow-400' 
                  : 'text-gray-300'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
        </p>
      </div>

      {showDetailed && (
        <>
          {/* Rating Distribution */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Rating Distribution</h4>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          rating >= 4 ? 'bg-green-500' : 
                          rating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Ratings */}
          {stats.detailedAverages && Object.keys(stats.detailedAverages).length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Detailed Ratings</h4>
              <div className="space-y-2">
                {Object.entries(stats.detailedAverages).map(([category, rating]) => {
                  if (typeof rating !== 'number') return null;
                  
                  const label = {
                    communication: 'Communication',
                    reliability: 'Reliability',
                    cleanliness: 'Cleanliness',
                    accuracy: 'Accuracy',
                    experience: 'Experience'
                  }[category] || category;

                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{label}</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${
                                star <= Math.round(rating) 
                                  ? 'text-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          {reviewFormatting.formatRating(rating)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Most Used Tags */}
          {stats.mostUsedTags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Most Common Tags</h4>
              <div className="flex flex-wrap gap-2">
                {stats.mostUsedTags.slice(0, 8).map(({ tag, count }) => {
                  const colorType = getReviewTagColor(tag);
                  const bgColor = {
                    positive: 'bg-green-100 text-green-800 border-green-200',
                    neutral: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    negative: 'bg-red-100 text-red-800 border-red-200'
                  }[colorType];

                  return (
                    <span
                      key={tag}
                      className={`px-2 py-1 text-xs rounded-full border ${bgColor}`}
                    >
                      {getReviewTagLabel(tag)} ({count})
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review Type Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {stats.reviewsByType.asRenter}
              </div>
              <div className="text-sm text-blue-600">As Renter</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {stats.reviewsByType.asOwner}
              </div>
              <div className="text-sm text-purple-600">As Owner</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 