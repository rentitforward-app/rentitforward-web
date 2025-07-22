import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Build date filter
    const dateFilter = startDate && endDate ? {
      gte: startDate,
      lte: endDate
    } : null;

    // 1. Overall Statistics
    const overviewData = await getOverviewStats(supabase, dateFilter);
    
    // 2. Rating Distribution
    const ratingDistribution = await getRatingDistribution(supabase, dateFilter);
    
    // 3. Reviews by Type
    const reviewsByType = await getReviewsByType(supabase, dateFilter);
    
    // 4. Monthly Trends (last 12 months)
    const monthlyTrends = await getMonthlyTrends(supabase);
    
    // 5. Top Listings by Rating
    const topListings = await getTopListings(supabase, dateFilter);
    
    // 6. Top Users by Rating
    const topUsers = await getTopUsers(supabase, dateFilter);
    
    // 7. Recent Activity
    const recentActivity = await getRecentActivity(supabase);

    const analytics: ReviewAnalytics = {
      overview: overviewData,
      ratingDistribution,
      reviewsByType,
      monthlyTrends,
      topListings,
      topUsers,
      recentActivity
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching review analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getOverviewStats(supabase: any, dateFilter: any) {
  const baseQuery = supabase.from('reviews').select('rating, response, created_at');
  
  if (dateFilter) {
    baseQuery.gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte);
  }

  const { data: allReviews } = await baseQuery;
  
  if (!allReviews || allReviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      reviewsThisMonth: 0,
      reviewsLastMonth: 0,
      monthlyGrowth: 0,
      responseRate: 0,
    };
  }

  // Calculate basic stats
  const totalReviews = allReviews.length;
  const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const reviewsWithResponses = allReviews.filter(r => r.response).length;
  const responseRate = (reviewsWithResponses / totalReviews) * 100;

  // Calculate monthly stats
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const reviewsThisMonth = allReviews.filter(r => 
    new Date(r.created_at) >= thisMonthStart
  ).length;

  const reviewsLastMonth = allReviews.filter(r => {
    const reviewDate = new Date(r.created_at);
    return reviewDate >= lastMonthStart && reviewDate <= lastMonthEnd;
  }).length;

  const monthlyGrowth = reviewsLastMonth > 0 
    ? ((reviewsThisMonth - reviewsLastMonth) / reviewsLastMonth) * 100
    : reviewsThisMonth > 0 ? 100 : 0;

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 100) / 100,
    reviewsThisMonth,
    reviewsLastMonth,
    monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
    responseRate: Math.round(responseRate * 100) / 100,
  };
}

async function getRatingDistribution(supabase: any, dateFilter: any) {
  const baseQuery = supabase.from('reviews').select('rating');
  
  if (dateFilter) {
    baseQuery.gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte);
  }

  const { data: reviews } = await baseQuery;
  
  const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  
  reviews?.forEach(review => {
    distribution[review.rating.toString()]++;
  });

  return distribution;
}

async function getReviewsByType(supabase: any, dateFilter: any) {
  const baseQuery = supabase.from('reviews').select('type');
  
  if (dateFilter) {
    baseQuery.gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte);
  }

  const { data: reviews } = await baseQuery;
  
  const renterToOwner = reviews?.filter(r => r.type === 'renter_to_owner').length || 0;
  const ownerToRenter = reviews?.filter(r => r.type === 'owner_to_renter').length || 0;

  return { renterToOwner, ownerToRenter };
}

async function getMonthlyTrends(supabase: any) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, response, created_at')
    .gte('created_at', twelveMonthsAgo.toISOString());

  const monthlyData: { [key: string]: { ratings: number[], responses: number, total: number } } = {};

  reviews?.forEach(review => {
    const date = new Date(review.created_at);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { ratings: [], responses: 0, total: 0 };
    }
    
    monthlyData[monthKey].ratings.push(review.rating);
    monthlyData[monthKey].total++;
    if (review.response) {
      monthlyData[monthKey].responses++;
    }
  });

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      totalReviews: data.total,
      averageRating: data.ratings.length > 0 
        ? Math.round((data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length) * 100) / 100
        : 0,
      responseRate: data.total > 0 
        ? Math.round((data.responses / data.total) * 100 * 100) / 100
        : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

async function getTopListings(supabase: any, dateFilter: any) {
  let query = supabase
    .from('reviews')
    .select(`
      rating,
      booking:booking_id (
        listing:listing_id (
          id,
          title
        )
      )
    `);

  if (dateFilter) {
    query = query.gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte);
  }

  const { data: reviews } = await query;

  const listingStats: { [key: string]: { title: string, ratings: number[], count: number } } = {};

  reviews?.forEach(review => {
    if (review.booking?.listing) {
      const listingId = review.booking.listing.id;
      const listingTitle = review.booking.listing.title;
      
      if (!listingStats[listingId]) {
        listingStats[listingId] = { title: listingTitle, ratings: [], count: 0 };
      }
      
      listingStats[listingId].ratings.push(review.rating);
      listingStats[listingId].count++;
    }
  });

  return Object.entries(listingStats)
    .map(([listingId, stats]) => ({
      listingId,
      listingTitle: stats.title,
      averageRating: Math.round((stats.ratings.reduce((sum, r) => sum + r, 0) / stats.ratings.length) * 100) / 100,
      totalReviews: stats.count,
    }))
    .filter(listing => listing.totalReviews >= 3) // Only show listings with at least 3 reviews
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 10);
}

async function getTopUsers(supabase: any, dateFilter: any) {
  let query = supabase
    .from('reviews')
    .select(`
      rating,
      reviewee:reviewee_id (
        id,
        full_name
      )
    `);

  if (dateFilter) {
    query = query.gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte);
  }

  const { data: reviews } = await query;

  const userStats: { [key: string]: { name: string, ratings: number[], count: number } } = {};

  reviews?.forEach(review => {
    if (review.reviewee) {
      const userId = review.reviewee.id;
      const userName = review.reviewee.full_name;
      
      if (!userStats[userId]) {
        userStats[userId] = { name: userName, ratings: [], count: 0 };
      }
      
      userStats[userId].ratings.push(review.rating);
      userStats[userId].count++;
    }
  });

  return Object.entries(userStats)
    .map(([userId, stats]) => ({
      userId,
      userName: stats.name,
      averageRating: Math.round((stats.ratings.reduce((sum, r) => sum + r, 0) / stats.ratings.length) * 100) / 100,
      totalReviews: stats.count,
    }))
    .filter(user => user.totalReviews >= 3) // Only show users with at least 3 reviews
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 10);
}

async function getRecentActivity(supabase: any) {
  // Get recent reviews
  const { data: recentReviews } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      response,
      created_at,
      reviewer:reviewer_id (
        full_name
      ),
      reviewee:reviewee_id (
        full_name
      ),
      booking:booking_id (
        listing:listing_id (
          title
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  const activity = [];

  recentReviews?.forEach(review => {
    // Add review activity
    activity.push({
      id: review.id,
      type: 'review' as const,
      reviewerName: review.reviewer?.full_name || 'Unknown',
      revieweeName: review.reviewee?.full_name || 'Unknown',
      listingTitle: review.booking?.listing?.title || 'Unknown Listing',
      rating: review.rating,
      createdAt: review.created_at,
    });

    // Add response activity if exists
    if (review.response) {
      activity.push({
        id: `${review.id}-response`,
        type: 'response' as const,
        reviewerName: review.reviewee?.full_name || 'Unknown',
        revieweeName: review.reviewer?.full_name || 'Unknown',
        listingTitle: review.booking?.listing?.title || 'Unknown Listing',
        createdAt: review.response.createdAt,
      });
    }
  });

  return activity
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
} 