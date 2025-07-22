'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  type Review, 
  type CreateReview, 
  type UpdateReview, 
  type ReviewFilter,
  type ReviewWithUser
} from '@/shared';

// Query Keys
const REVIEW_KEYS = {
  all: ['reviews'] as const,
  lists: () => [...REVIEW_KEYS.all, 'list'] as const,
  list: (filters: Partial<ReviewFilter>) => [...REVIEW_KEYS.lists(), filters] as const,
  details: () => [...REVIEW_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...REVIEW_KEYS.details(), id] as const,
  booking: (bookingId: string) => [...REVIEW_KEYS.all, 'booking', bookingId] as const,
  user: (userId: string) => [...REVIEW_KEYS.all, 'user', userId] as const,
};

// API Functions
const reviewsApi = {
  // Get reviews with filters
  getReviews: async (filters: Partial<ReviewFilter> = {}): Promise<{
    reviews: ReviewWithUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/reviews?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch reviews');
    }
    return response.json();
  },

  // Get single review
  getReview: async (id: string): Promise<{ review: ReviewWithUser }> => {
    const response = await fetch(`/api/reviews/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch review');
    }
    return response.json();
  },

  // Get reviews for a booking
  getBookingReviews: async (bookingId: string): Promise<{
    reviews: ReviewWithUser[];
    booking: {
      id: string;
      status: string;
      canRenterReview: boolean;
      canOwnerReview: boolean;
      userRole: 'renter' | 'owner';
    };
  }> => {
    const response = await fetch(`/api/reviews/booking/${bookingId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch booking reviews');
    }
    return response.json();
  },

  // Create review
  createReview: async (data: CreateReview): Promise<{ review: ReviewWithUser }> => {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create review');
    }
    return response.json();
  },

  // Update review
  updateReview: async ({ id, data }: { id: string; data: UpdateReview }): Promise<{ review: ReviewWithUser }> => {
    const response = await fetch(`/api/reviews/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update review');
    }
    return response.json();
  },

  // Delete review
  deleteReview: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`/api/reviews/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete review');
    }
    return response.json();
  },
};

// Hooks
export function useReviews(filters: Partial<ReviewFilter> = {}) {
  return useQuery({
    queryKey: REVIEW_KEYS.list(filters),
    queryFn: () => reviewsApi.getReviews(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useReview(id: string) {
  return useQuery({
    queryKey: REVIEW_KEYS.detail(id),
    queryFn: () => reviewsApi.getReview(id),
    enabled: !!id,
  });
}

export function useBookingReviews(bookingId: string) {
  return useQuery({
    queryKey: REVIEW_KEYS.booking(bookingId),
    queryFn: () => reviewsApi.getBookingReviews(bookingId),
    enabled: !!bookingId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.createReview,
    onSuccess: (data) => {
      // Invalidate and refetch review lists
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.lists() });
      // Invalidate booking reviews
      queryClient.invalidateQueries({ 
        queryKey: REVIEW_KEYS.booking(data.review.bookingId) 
      });
      // Invalidate user reviews
      queryClient.invalidateQueries({ 
        queryKey: REVIEW_KEYS.user(data.review.revieweeId) 
      });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.updateReview,
    onSuccess: (data, variables) => {
      // Update the specific review in cache
      queryClient.setQueryData(
        REVIEW_KEYS.detail(variables.id),
        data
      );
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.lists() });
      queryClient.invalidateQueries({ 
        queryKey: REVIEW_KEYS.booking(data.review.bookingId) 
      });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewsApi.deleteReview,
    onSuccess: (_, reviewId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: REVIEW_KEYS.detail(reviewId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.all });
    },
  });
}

// Hook for managing review modal state
export function useReviewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [reviewData, setReviewData] = useState<{
    bookingId: string;
    reviewType: 'renter_to_owner' | 'owner_to_renter';
    revieweeName: string;
    listingTitle: string;
  } | null>(null);

  const openModal = (data: NonNullable<typeof reviewData>) => {
    setReviewData(data);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setReviewData(null);
  };

  return {
    isOpen,
    reviewData,
    openModal,
    closeModal,
  };
}

// Hook for review form state
export function useReviewForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createReview = useCreateReview();

  const submitReview = async (data: CreateReview) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await createReview.mutateAsync(data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  };

  return {
    submitReview,
    isSubmitting,
    error,
    success,
    reset,
  };
}

// Hook for checking review eligibility
export function useReviewEligibility(bookingId: string) {
  const { data, isLoading } = useBookingReviews(bookingId);

  return {
    canRenterReview: data?.booking.canRenterReview ?? false,
    canOwnerReview: data?.booking.canOwnerReview ?? false,
    userRole: data?.booking.userRole,
    bookingStatus: data?.booking.status,
    existingReviews: data?.reviews ?? [],
    isLoading,
  };
}

// Review Response API functions
const reviewResponseApi = {
  async createResponse(reviewId: string, comment: string) {
    const response = await fetch(`/api/reviews/${reviewId}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, comment }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create response');
    }

    return response.json();
  },

  async updateResponse(reviewId: string, comment: string) {
    const response = await fetch(`/api/reviews/${reviewId}/response`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update response');
    }

    return response.json();
  },

  async deleteResponse(reviewId: string) {
    const response = await fetch(`/api/reviews/${reviewId}/response`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete response');
    }

    return response.json();
  },
};

// Hook for creating review responses
export function useCreateReviewResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, comment }: { reviewId: string; comment: string }) =>
      reviewResponseApi.createResponse(reviewId, comment),
    onSuccess: (data) => {
      // Invalidate the specific review
      queryClient.invalidateQueries({ 
        queryKey: REVIEW_KEYS.detail(data.review.id) 
      });
      // Invalidate review lists
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.lists() });
      // Invalidate booking reviews if applicable
      if (data.review.bookingId) {
        queryClient.invalidateQueries({ 
          queryKey: REVIEW_KEYS.booking(data.review.bookingId) 
        });
      }
    },
    onError: (error: Error) => {
      console.error('Error creating review response:', error);
    },
  });
}

// Hook for updating review responses
export function useUpdateReviewResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, comment }: { reviewId: string; comment: string }) =>
      reviewResponseApi.updateResponse(reviewId, comment),
    onSuccess: (data) => {
      // Invalidate the specific review
      queryClient.invalidateQueries({ 
        queryKey: REVIEW_KEYS.detail(data.review.id) 
      });
      // Invalidate review lists
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.lists() });
    },
    onError: (error: Error) => {
      console.error('Error updating review response:', error);
    },
  });
}

// Hook for deleting review responses
export function useDeleteReviewResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewResponseApi.deleteResponse(reviewId),
    onSuccess: (data) => {
      // Invalidate the specific review
      queryClient.invalidateQueries({ 
        queryKey: REVIEW_KEYS.detail(data.review.id) 
      });
      // Invalidate review lists
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.lists() });
    },
    onError: (error: Error) => {
      console.error('Error deleting review response:', error);
    },
  });
} 