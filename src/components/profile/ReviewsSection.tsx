'use client';

import React, { useState } from 'react';
import { Star, MessageCircle, TrendingUp, Award, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsSectionProps {
  userId: string;
  className?: string;
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  type: string;
  created_at: string;
  reviewer?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  reviewee?: {
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

export function ReviewsSection({ userId, className = '' }: ReviewsSectionProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');

  // Fetch received reviews
  const { data: receivedReviews = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['user-received-reviews', userId],
    queryFn: async (): Promise<UserReview[]> => {
      const response = await fetch(`/api/users/${userId}/reviews/received`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch received reviews');
      }
      const data = await response.json();
      return data.reviews;
    },
  });

  // Fetch given reviews
  const { data: givenReviews = [], isLoading: loadingGiven } = useQuery({
    queryKey: ['user-given-reviews', userId],
    queryFn: async (): Promise<UserReview[]> => {
      const response = await fetch(`/api/users/${userId}/reviews/given`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch given reviews');
      }
      const data = await response.json();
      return data.reviews;
    },
  });

  // Calculate stats
  const averageRating = receivedReviews.length > 0 
    ? receivedReviews.reduce((sum, review) => sum + review.rating, 0) / receivedReviews.length 
    : 0;

  const renderStars = (rating: number) => (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= Math.floor(rating)
              ? 'text-yellow-400 fill-current'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const renderReviewCard = (review: UserReview) => {
    const otherParty = activeTab === 'received' ? review.reviewer : review.reviewee;
    
    return (
      <Card key={review.id} className="p-4">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900">
                  {otherParty?.full_name || 'Anonymous'}
                </p>
                <p className="text-sm text-gray-600">
                  {review.booking.listing.title}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {renderStars(review.rating)}
                <span className="text-sm text-gray-600">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            {review.comment && (
              <p className="text-gray-700 text-sm">{review.comment}</p>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
        {receivedReviews.length > 0 && (
          <div className="flex items-center space-x-2">
            {renderStars(averageRating)}
            <span className="text-sm font-medium text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">
              ({receivedReviews.length} reviews)
            </span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {averageRating.toFixed(1)}
          </p>
          <p className="text-sm text-gray-600">Average</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {receivedReviews.length}
          </p>
          <p className="text-sm text-gray-600">Received</p>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {givenReviews.length}
          </p>
          <p className="text-sm text-gray-600">Given</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('received')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'received'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Received ({receivedReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('given')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'given'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Given ({givenReviews.length})
          </button>
        </div>
      </div>

      {/* Reviews List */}
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
            receivedReviews.map(renderReviewCard)
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
              <p className="text-gray-600">Leave reviews for your completed rentals!</p>
            </div>
          ) : (
            givenReviews.map(renderReviewCard)
          )
        )}
      </div>
    </div>
  );
} 