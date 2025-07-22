import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { 
  CreateReviewSchema, 
  ReviewFilterSchema, 
  ReviewType, 
  type Review, 
  type ReviewWithUser 
} from '@/shared';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  try {
    // Parse and validate query parameters
    const filterParams = Object.fromEntries(searchParams.entries());
    const filters = ReviewFilterSchema.parse({
      ...filterParams,
      page: filterParams.page ? parseInt(filterParams.page) : undefined,
      limit: filterParams.limit ? parseInt(filterParams.limit) : undefined,
      minRating: filterParams.minRating ? parseInt(filterParams.minRating) : undefined,
      maxRating: filterParams.maxRating ? parseInt(filterParams.maxRating) : undefined,
      hasComment: filterParams.hasComment === 'true',
      isPublic: filterParams.isPublic === 'true'
    });

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build the query
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (
          id,
          full_name,
          avatar_url
        ),
        reviewee:reviewee_id (
          id,
          full_name,
          avatar_url
        ),
        booking:booking_id (
          id,
          start_date,
          end_date,
          listing:listing_id (
            title
          )
        )
      `);

    // Apply filters
    if (filters.userId) {
      query = query.or(`reviewer_id.eq.${filters.userId},reviewee_id.eq.${filters.userId}`);
    }
    if (filters.reviewerId) {
      query = query.eq('reviewer_id', filters.reviewerId);
    }
    if (filters.revieweeId) {
      query = query.eq('reviewee_id', filters.revieweeId);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }
    if (filters.maxRating) {
      query = query.lte('rating', filters.maxRating);
    }
    if (filters.hasComment !== undefined) {
      if (filters.hasComment) {
        query = query.not('comment', 'is', null);
      } else {
        query = query.is('comment', null);
      }
    }
    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }
    if (filters.searchText) {
      // Use ilike for case-insensitive text search in comments
      query = query.ilike('comment', `%${filters.searchText}%`);
    }

    // Add sorting
    switch (filters.sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'rating_high':
        query = query.order('rating', { ascending: false });
        break;
      case 'rating_low':
        query = query.order('rating', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const offset = (filters.page - 1) * filters.limit;
    query = query.range(offset, offset + filters.limit - 1);

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json({
      reviews: reviews || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit)
      }
    });

  } catch (error) {
    console.error('Error in reviews GET:', error);
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reviewData = CreateReviewSchema.parse(body);

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the booking exists and user is part of it
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, renter_id, owner_id, status')
      .eq('id', reviewData.bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed bookings' }, 
        { status: 400 }
      );
    }

    // Determine reviewer and reviewee based on review type
    let reviewerId: string;
    let revieweeId: string;

    if (reviewData.type === ReviewType.RENTER_TO_OWNER) {
      if (booking.renter_id !== user.id) {
        return NextResponse.json({ error: 'Only the renter can review the owner' }, { status: 403 });
      }
      reviewerId = booking.renter_id;
      revieweeId = booking.owner_id;
    } else if (reviewData.type === ReviewType.OWNER_TO_RENTER) {
      if (booking.owner_id !== user.id) {
        return NextResponse.json({ error: 'Only the owner can review the renter' }, { status: 403 });
      }
      reviewerId = booking.owner_id;
      revieweeId = booking.renter_id;
    } else {
      return NextResponse.json({ error: 'Invalid review type' }, { status: 400 });
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', reviewData.bookingId)
      .eq('type', reviewData.type)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this booking' }, 
        { status: 409 }
      );
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: reviewData.bookingId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        type: reviewData.type,
        rating: reviewData.rating,
        comment: reviewData.comment || null,
        // Note: tags and detailed_ratings would need to be stored as JSON in Supabase
        // or in separate tables depending on your schema design
      })
      .select(`
        *,
        reviewer:reviewer_id (
          id,
          full_name,
          avatar_url
        ),
        reviewee:reviewee_id (
          id,
          full_name,
          avatar_url
        ),
        booking:booking_id (
          id,
          start_date,
          end_date,
          listing:listing_id (
            title
          )
        )
      `)
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }

    // Update user's rating (this could be done via database trigger in production)
    await updateUserRating(supabase, revieweeId);

    // Update booking with review reference
    const updateField = reviewData.type === ReviewType.RENTER_TO_OWNER 
      ? 'renter_review_id' 
      : 'owner_review_id';
    
    await supabase
      .from('bookings')
      .update({ [updateField]: review.id })
      .eq('id', reviewData.bookingId);

    return NextResponse.json({ review }, { status: 201 });

  } catch (error) {
    console.error('Error in reviews POST:', error);
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update user's overall rating
async function updateUserRating(supabase: any, userId: string) {
  try {
    // Calculate new average rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      const totalReviews = reviews.length;

      // Update user profile
      await supabase
        .from('profiles')
        .update({ 
          rating: averageRating,
          total_reviews: totalReviews
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Error updating user rating:', error);
    // Don't throw error as this is not critical for the main operation
  }
} 