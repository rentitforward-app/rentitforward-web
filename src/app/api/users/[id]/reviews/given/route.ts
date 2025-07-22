import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;

    // Only allow users to view their own given reviews
    if (user.id !== targetUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch reviews given by the user
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        type,
        created_at,
        reviewee:reviewee_id (
          id,
          full_name,
          avatar_url
        ),
        bookings!inner (
          id,
          listings (
            title
          )
        )
      `)
      .eq('reviewer_id', targetUserId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching given reviews:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Transform the data to match expected format
    const transformedReviews = reviews?.map((review: any) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      type: review.type,
      created_at: review.created_at,
      reviewee: review.reviewee, // For given reviews, we show who was reviewed
      booking: {
        id: review.bookings?.id,
        listing: {
          title: review.bookings?.listings?.title
        }
      }
    })) || [];

    return NextResponse.json({ reviews: transformedReviews });

  } catch (error) {
    console.error('Error in given reviews GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 