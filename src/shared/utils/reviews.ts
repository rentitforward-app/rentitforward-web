import { Review, ReviewTag, ReviewType, ReviewStats, getReviewTagColor } from '../types/review';

// Review validation utilities
export const reviewValidation = {
  canEditReview: (review: Review): boolean => {
    const reviewCreatedAt = new Date(review.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - reviewCreatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation <= 24;
  },

  canDeleteReview: (review: Review): boolean => {
    const reviewCreatedAt = new Date(review.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - reviewCreatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation <= 1;
  },

  isValidRating: (rating: number): boolean => {
    return Number.isInteger(rating) && rating >= 1 && rating <= 5;
  },

  isValidComment: (comment: string): boolean => {
    return comment.length >= 10 && comment.length <= 1000;
  },

  maxTagsAllowed: 5,

  isValidTagSelection: (tags: ReviewTag[]): boolean => {
    return tags.length <= reviewValidation.maxTagsAllowed;
  }
};

// Review formatting utilities
export const reviewFormatting = {
  formatRating: (rating: number): string => {
    return rating.toFixed(1);
  },

  formatRelativeTime: (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  },

  formatDate: (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  generateStarRating: (rating: number): string => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
  },

  truncateComment: (comment: string, maxLength: number = 150): string => {
    if (comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength).trim() + '...';
  }
};

// Review statistics calculations
export const reviewStats = {
  calculateAverageRating: (reviews: Review[]): number => {
    if (reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
  },

  calculateRatingDistribution: (reviews: Review[]): { 1: number; 2: number; 3: number; 4: number; 5: number } => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating as keyof typeof distribution]++;
      }
    });
    return distribution;
  },

  calculateDetailedAverages: (reviews: Review[]): {
    communication?: number;
    reliability?: number;
    cleanliness?: number;
    accuracy?: number;
    experience?: number;
  } | undefined => {
    const validReviews = reviews.filter(r => r.detailedRatings);
    if (validReviews.length === 0) return undefined;

    const totals = {
      communication: 0,
      reliability: 0,
      cleanliness: 0,
      accuracy: 0,
      experience: 0
    };

    const counts = {
      communication: 0,
      reliability: 0,
      cleanliness: 0,
      accuracy: 0,
      experience: 0
    };

    validReviews.forEach(review => {
      if (review.detailedRatings) {
        Object.entries(review.detailedRatings).forEach(([key, value]) => {
          if (value && key in totals) {
            totals[key as keyof typeof totals] += value;
            counts[key as keyof typeof counts]++;
          }
        });
      }
    });

    const averages: {
      communication?: number;
      reliability?: number;
      cleanliness?: number;
      accuracy?: number;
      experience?: number;
    } = {};

    Object.keys(totals).forEach(key => {
      const count = counts[key as keyof typeof counts];
      if (count > 0) {
        averages[key as keyof typeof averages] = totals[key as keyof typeof totals] / count;
      }
    });

    return averages;
  },

  getMostUsedTags: (reviews: Review[], limit: number = 10) => {
    const tagCounts: Record<string, number> = {};
    
    reviews.forEach(review => {
      review.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag: tag as ReviewTag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  generateReviewStats: (reviews: Review[]): ReviewStats => {
    return {
      totalReviews: reviews.length,
      averageRating: reviewStats.calculateAverageRating(reviews),
      ratingDistribution: reviewStats.calculateRatingDistribution(reviews),
      detailedAverages: reviewStats.calculateDetailedAverages(reviews),
      mostUsedTags: reviewStats.getMostUsedTags(reviews),
      reviewsByType: {
        asRenter: reviews.filter(r => r.type === ReviewType.OWNER_TO_RENTER).length,
        asOwner: reviews.filter(r => r.type === ReviewType.RENTER_TO_OWNER).length
      }
    };
  }
};

// Review filtering and sorting
export const reviewFilters = {
  filterByRating: (reviews: Review[], minRating?: number, maxRating?: number): Review[] => {
    return reviews.filter(review => {
      if (minRating && review.rating < minRating) return false;
      if (maxRating && review.rating > maxRating) return false;
      return true;
    });
  },

  filterByType: (reviews: Review[], type: ReviewType): Review[] => {
    return reviews.filter(review => review.type === type);
  },

  filterByTags: (reviews: Review[], tags: ReviewTag[]): Review[] => {
    return reviews.filter(review => 
      tags.some(tag => review.tags.includes(tag))
    );
  },

  filterByDateRange: (reviews: Review[], startDate?: string, endDate?: string): Review[] => {
    return reviews.filter(review => {
      const reviewDate = new Date(review.createdAt);
      if (startDate && reviewDate < new Date(startDate)) return false;
      if (endDate && reviewDate > new Date(endDate)) return false;
      return true;
    });
  },

  sortReviews: (reviews: Review[], sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low'): Review[] => {
    const sorted = [...reviews];
    
    switch (sortBy) {
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'rating_high':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'rating_low':
        return sorted.sort((a, b) => a.rating - b.rating);
      default: // newest
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }
};

// Review display helpers
export const reviewDisplay = {
  getReviewTypeLabel: (type: ReviewType): string => {
    return type === ReviewType.RENTER_TO_OWNER ? 'Renter to Owner' : 'Owner to Renter';
  },

  getReviewTitle: (type: ReviewType, reviewerName: string): string => {
    const role = type === ReviewType.RENTER_TO_OWNER ? 'renter' : 'owner';
    return `Review from ${reviewerName} (as ${role})`;
  },

  shouldShowDetailedRatings: (review: Review): boolean => {
    return !!(review.detailedRatings && Object.keys(review.detailedRatings).length > 0);
  },

  getTagsByColor: (tags: ReviewTag[]) => {
    return {
      positive: tags.filter(tag => getReviewTagColor(tag) === 'positive'),
      neutral: tags.filter(tag => getReviewTagColor(tag) === 'neutral'),
      negative: tags.filter(tag => getReviewTagColor(tag) === 'negative')
    };
  },

  getRatingColor: (rating: number): 'green' | 'yellow' | 'red' => {
    if (rating >= 4) return 'green';
    if (rating >= 3) return 'yellow';
    return 'red';
  },

  getRatingEmoji: (rating: number): string => {
    if (rating >= 4.5) return '😊';
    if (rating >= 4) return '🙂';
    if (rating >= 3) return '😐';
    if (rating >= 2) return '🙁';
    return '😞';
  }
};

// Review notification helpers
export const reviewNotifications = {
  generateReviewRequestMessage: (bookingTitle: string, reviewerRole: 'renter' | 'owner'): string => {
    return `Please review your recent ${reviewerRole === 'renter' ? 'rental' : 'booking'} of "${bookingTitle}"`;
  },

  generateReviewReceivedMessage: (reviewerName: string, rating: number): string => {
    return `${reviewerName} left you a ${rating}-star review`;
  },

  generateReviewResponseMessage: (responderName: string): string => {
    return `${responderName} responded to your review`;
  }
}; 