'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Star, Calendar, Users, MessageSquare, TrendingUp, Filter } from 'lucide-react';

interface ReviewAnalytics {
  overview: {
    totalReviews: number;
    averageRating: number;
    reviewsThisMonth: number;
    reviewsLastMonth: number;
    monthlyGrowth: number;
    responseRate: number;
  };
  ratingDistribution: {
    [key: string]: number;
  };
  reviewsByType: {
    renterToOwner: number;
    ownerToRenter: number;
  };
  monthlyTrends: Array<{
    month: string;
    totalReviews: number;
    averageRating: number;
    responseRate: number;
  }>;
  topListings: Array<{
    listingId: string;
    listingTitle: string;
    averageRating: number;
    totalReviews: number;
  }>;
  topUsers: Array<{
    userId: string;
    userName: string;
    averageRating: number;
    totalReviews: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'review' | 'response';
    reviewerName: string;
    revieweeName: string;
    listingTitle: string;
    rating?: number;
    createdAt: string;
  }>;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export function ReviewAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['reviewAnalytics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await fetch(`/api/admin/review-analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json() as Promise<ReviewAnalytics>;
    },
  });

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ startDate: start, endDate: end });
  };

  const clearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Review Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Review Analytics</h1>
        </div>
        <Card className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <MessageSquare className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header with Date Range Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor and analyze platform reviews</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => handleDateRangeChange(e.target.value, dateRange.endDate)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => handleDateRangeChange(dateRange.startDate, e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(dateRange.startDate || dateRange.endDate) && (
            <Button variant="outline" size="sm" onClick={clearDateRange}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.overview.totalReviews.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {analytics.overview.reviewsThisMonth} this month
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {analytics.overview.monthlyGrowth !== 0 && (
            <div className="mt-4 flex items-center">
              <TrendingUp className={`w-4 h-4 mr-1 ${
                analytics.overview.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'
              }`} />
              <span className={`text-sm font-medium ${
                analytics.overview.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(analytics.overview.monthlyGrowth).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.overview.averageRating.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Overall platform rating</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.overview.responseRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">Reviews with responses</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
          <RatingDistributionChart data={analytics.ratingDistribution} />
        </Card>

        {/* Review Types */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reviews by Type</h3>
          <ReviewTypeChart data={analytics.reviewsByType} />
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
        <MonthlyTrendsChart data={analytics.monthlyTrends} />
      </Card>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Listings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Rated Listings</h3>
          <TopListingsTable data={analytics.topListings} />
        </Card>

        {/* Top Users */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Rated Users</h3>
          <TopUsersTable data={analytics.topUsers} />
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <RecentActivityList data={analytics.recentActivity} />
      </Card>
    </div>
  );
}

// Helper Components (keeping the same implementations but with updated styling to match admin theme)

function RatingDistributionChart({ data }: { data: { [key: string]: number } }) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="space-y-3">
      {[5, 4, 3, 2, 1].map(rating => {
        const count = data[rating.toString()] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        
        return (
          <div key={rating} className="flex items-center space-x-3">
            <span className="text-sm font-medium w-4">{rating}</span>
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-12">{count}</span>
            <span className="text-sm text-gray-500 w-12">{percentage.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewTypeChart({ data }: { data: { renterToOwner: number; ownerToRenter: number } }) {
  const total = data.renterToOwner + data.ownerToRenter;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium">Renter → Owner</span>
        </div>
        <span className="text-sm text-gray-600">{data.renterToOwner}</span>
      </div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium">Owner → Renter</span>
        </div>
        <span className="text-sm text-gray-600">{data.ownerToRenter}</span>
      </div>
      
      {total > 0 && (
        <div className="mt-4">
          <div className="flex h-3 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${(data.renterToOwner / total) * 100}%` }}
            />
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(data.ownerToRenter / total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{((data.renterToOwner / total) * 100).toFixed(1)}%</span>
            <span>{((data.ownerToRenter / total) * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyTrendsChart({ data }: { data: Array<{ month: string; totalReviews: number; averageRating: number; responseRate: number }> }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No trend data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">Month</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">Reviews</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">Avg Rating</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">Response Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.slice(-6).map((item) => (
            <tr key={item.month} className="hover:bg-gray-50">
              <td className="py-4 text-sm font-medium text-gray-900">{item.month}</td>
              <td className="py-4 text-sm text-gray-600">{item.totalReviews}</td>
              <td className="py-4 text-sm text-gray-600">
                <div className="flex items-center">
                  {item.averageRating.toFixed(1)}
                  <Star className="w-3 h-3 text-yellow-400 fill-current ml-1" />
                </div>
              </td>
              <td className="py-4 text-sm text-gray-600">{item.responseRate.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopListingsTable({ data }: { data: Array<{ listingId: string; listingTitle: string; averageRating: number; totalReviews: number }> }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No listings data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((listing, index) => (
        <div key={listing.listingId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {listing.listingTitle.length > 30 
                  ? `${listing.listingTitle.substring(0, 30)}...` 
                  : listing.listingTitle
                }
              </p>
              <p className="text-xs text-gray-500">{listing.totalReviews} reviews</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-900">{listing.averageRating.toFixed(1)}</span>
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopUsersTable({ data }: { data: Array<{ userId: string; userName: string; averageRating: number; totalReviews: number }> }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No users data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((user, index) => (
        <div key={user.userId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{user.userName}</p>
              <p className="text-xs text-gray-500">{user.totalReviews} reviews</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-900">{user.averageRating.toFixed(1)}</span>
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentActivityList({ data }: { data: Array<{ id: string; type: 'review' | 'response'; reviewerName: string; revieweeName: string; listingTitle: string; rating?: number; createdAt: string }> }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 10).map((activity) => (
        <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex-shrink-0 p-2 rounded-full bg-gray-100">
            {activity.type === 'review' ? (
              <Star className="w-4 h-4 text-yellow-500" />
            ) : (
              <MessageSquare className="w-4 h-4 text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {activity.type === 'review' ? (
                <>
                  <span className="font-semibold">{activity.reviewerName}</span> reviewed{' '}
                  <span className="font-semibold">{activity.revieweeName}</span>
                  {activity.rating && (
                    <span className="ml-2 text-yellow-500">
                      {activity.rating} ⭐
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-semibold">{activity.reviewerName}</span> responded to{' '}
                  <span className="font-semibold">{activity.revieweeName}</span>'s review
                </>
              )}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {activity.listingTitle}
            </p>
          </div>
          <div className="flex-shrink-0 text-xs text-gray-400">
            {new Date(activity.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
} 