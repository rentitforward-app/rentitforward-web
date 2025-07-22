'use client';

import React from 'react';
import { Star, MessageCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

interface ReviewStats {
  averageRating: number;
  totalReceived: number;
  totalGiven: number;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    reviewer: {
      full_name: string;
    };
    booking: {
      listing: {
        title: string;
      };
    };
  }>;
}

export function ReviewsWidget() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-review-stats', user?.id],
    queryFn: async (): Promise<ReviewStats> => {
      if (!user?.id) throw new Error('No user');

      const [receivedResponse, givenResponse] = await Promise.all([
        fetch(`/api/users/${user.id}/reviews/received`),
        fetch(`/api/users/${user.id}/reviews/given`)
      ]);

      const receivedData = receivedResponse.ok ? await receivedResponse.json() : { reviews: [] };
      const givenData = givenResponse.ok ? await givenResponse.json() : { reviews: [] };

      const receivedReviews = receivedData.reviews || [];
      const givenReviews = givenData.reviews || [];

      const averageRating = receivedReviews.length > 0 
        ? receivedReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / receivedReviews.length 
        : 0;

      return {
        averageRating,
        totalReceived: receivedReviews.length,
        totalGiven: givenReviews.length,
        recentReviews: receivedReviews.slice(0, 2)
      };
    },
    enabled: !!user?.id,
  });

  const handleViewProfile = () => {
    router.push('/profile');
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Star className="w-5 h-5 text-yellow-400 mr-2" />
          Reviews
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewProfile}
          className="text-sm"
        >
          View All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= Math.floor(stats.averageRating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {stats.averageRating.toFixed(1)}
          </p>
          <p className="text-xs text-gray-600">Rating</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <MessageCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {stats.totalReceived}
          </p>
          <p className="text-xs text-gray-600">Received</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {stats.totalGiven}
          </p>
          <p className="text-xs text-gray-600">Given</p>
        </div>
      </div>

      {/* Recent Reviews */}
      {stats.recentReviews.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Recent Reviews</h4>
          {stats.recentReviews.map((review) => (
            <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">
                  {review.reviewer.full_name}
                </p>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= review.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                {review.booking.listing.title}
              </p>
              {review.comment && (
                <p className="text-sm text-gray-700 line-clamp-2">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No reviews yet</p>
          <p className="text-xs text-gray-500">Complete rentals to receive reviews</p>
        </div>
      )}
    </Card>
  );
} 