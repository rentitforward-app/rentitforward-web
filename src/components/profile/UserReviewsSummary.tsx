'use client';

import React, { useState } from 'react';
import { Star, User, MessageCircle, Calendar, TrendingUp, Award } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { useQuery } from '@tanstack/react-query';

interface UserReviewsSummaryProps {
  userId: string;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  reviewsByType: {
    asRenter: number;
    asOwner: number;
  };
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  type: 'renter_to_owner' | 'owner_to_renter';
  created_at: string;
  reviewer: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  booking: {
    id: string;
    listing: {
      title: string;
    };
  };
}

export function UserReviewsSummary({ 
  userId, 
  showTitle = true, 
  compact = false, 
  className = '' 
}: UserReviewsSummaryProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');

  // Fetch user's received reviews
  const { data: receivedReviews = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['user-received-reviews', userId],
    queryFn: async (): Promise<UserReview[]> => {
      const response = await fetch(`/api/users/${userId}/reviews/received`);
      if (!response.ok) throw new Error('Failed to fetch received reviews');
      const data = await response.json();
      return data.reviews;
    },
  });

  // Fetch user's given reviews
  const { data: givenReviews = [], isLoading: loadingGiven } = useQuery({
    queryKey: ['user-given-reviews', userId],
    queryFn: async (): Promise<UserReview[]> => {
      const response = await fetch(`/api/users/${userId}/reviews/given`);
      if (!response.ok) throw new Error('Failed to fetch given reviews');
      const data = await response.json();
      return data.reviews;
    },
  });

  // Calculate review statistics
  const reviewStats: ReviewStats = React.useMemo(() => {
    const stats = {
      totalReviews: receivedReviews.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      reviewsByType: { asRenter: 0, asOwner: 0 }
    };

    if (receivedReviews.length > 0) {
      const totalRating = receivedReviews.reduce((sum, review) => sum + review.rating, 0);
      stats.averageRating = totalRating / receivedReviews.length;

      // Rating distribution
      receivedReviews.forEach(review => {
        stats.ratingDistribution[review.rating as keyof typeof stats.ratingDistribution]++;
      });

      // Reviews by type
      stats.reviewsByType.asRenter = receivedReviews.filter(r => r.type === 'owner_to_renter').length;
      stats.reviewsByType.asOwner = receivedReviews.filter(r => r.type === 'renter_to_owner').length;
    }

    return stats;
  }, [receivedReviews]);

  const renderRatingStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= Math.floor(rating)
                ? 'text-yellow-400 fill-current'
                : star <= rating
                ? 'text-yellow-400 fill-current opacity-50'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              {renderRatingStars(reviewStats.averageRating)}
              <span className="text-sm font-medium text-gray-900 ml-2">
                {reviewStats.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              ({reviewStats.totalReviews} reviews)
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('received')}
          >
            View Reviews
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              {renderRatingStars(reviewStats.averageRating)}
              <span className="font-medium text-gray-900 ml-1">
                {reviewStats.averageRating.toFixed(1)}
              </span>
              <span>({reviewStats.totalReviews} reviews)</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-lg font-semibold text-gray-900">
                {reviewStats.averageRating.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reviews</p>
              <p className="text-lg font-semibold text-gray-900">
                {reviewStats.totalReviews}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Experience</p>
              <p className="text-lg font-semibold text-gray-900">
                {reviewStats.reviewsByType.asRenter}R / {reviewStats.reviewsByType.asOwner}O
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Rating Distribution */}
      {reviewStats.totalReviews > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution];
              const percentage = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 w-8">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('received')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'received'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reviews Received ({receivedReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('given')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'given'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reviews Given ({givenReviews.length})
          </button>
        </div>
      </div>

      {/* Reviews Content */}
      <div className="space-y-4">
        {activeTab === 'received' ? (
          loadingReceived ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading reviews...</p>
            </div>
          ) : receivedReviews.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-600">Complete some rentals to receive your first review!</p>
            </div>
          ) : (
            receivedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showBookingInfo={true}
              />
            ))
          )
        ) : (
          loadingGiven ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading reviews...</p>
            </div>
          ) : givenReviews.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews given</h3>
              <p className="text-gray-600">Leave reviews for your completed rentals to help the community!</p>
            </div>
          ) : (
            givenReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showBookingInfo={true}
                showEditActions={true}
              />
            ))
          )
        )}
      </div>
    </div>
  );
} 