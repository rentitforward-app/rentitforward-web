import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { UpdateReviewSchema } from '@/shared';

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

    const { data: review, error } = await supabase
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
      `)
      .eq('id', params.id)
      .single();

    if (error || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user has permission to view this review
    // Allow if user is the reviewer, reviewee, or admin
    const isAuthorized = 
      review.reviewer_id === user.id || 
      review.reviewee_id === user.id ||
      // Add admin check here if needed
      false;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ review });

  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const updateData = UpdateReviewSchema.parse(body);

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the existing review
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user is the reviewer
    if (existingReview.reviewer_id !== user.id) {
      return NextResponse.json({ error: 'Only the reviewer can update this review' }, { status: 403 });
    }

    // Check if review can still be edited (e.g., within 24 hours)
    const reviewCreatedAt = new Date(existingReview.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - reviewCreatedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) {
      return NextResponse.json(
        { error: 'Reviews can only be edited within 24 hours of creation' }, 
        { status: 400 }
      );
    }

    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        ...updateData,
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
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

    if (updateError) {
      console.error('Error updating review:', updateError);
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }

    // Update user's rating if rating changed
    if (updateData.rating !== undefined) {
      await updateUserRating(supabase, existingReview.reviewee_id);
    }

    return NextResponse.json({ review: updatedReview });

  } catch (error) {
    console.error('Error in review PUT:', error);
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the existing review
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user is the reviewer or admin
    const isAuthorized = 
      existingReview.reviewer_id === user.id ||
      // Add admin check here if needed
      false;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Only the reviewer can delete this review' }, { status: 403 });
    }

    // Check if review can still be deleted (e.g., within 1 hour)
    const reviewCreatedAt = new Date(existingReview.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - reviewCreatedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 1) {
      return NextResponse.json(
        { error: 'Reviews can only be deleted within 1 hour of creation' }, 
        { status: 400 }
      );
    }

    // Delete the review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting review:', deleteError);
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
    }

    // Update user's rating after deletion
    await updateUserRating(supabase, existingReview.reviewee_id);

    // Remove review reference from booking
    const updateField = existingReview.type === 'renter_to_owner' 
      ? 'renter_review_id' 
      : 'owner_review_id';
    
    await supabase
      .from('bookings')
      .update({ [updateField]: null })
      .eq('id', existingReview.booking_id);

    return NextResponse.json({ message: 'Review deleted successfully' });

  } catch (error) {
    console.error('Error in review DELETE:', error);
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
    } else {
      // No reviews left, reset rating
      await supabase
        .from('profiles')
        .update({ 
          rating: 0,
          total_reviews: 0
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Error updating user rating:', error);
    // Don't throw error as this is not critical for the main operation
  }
} 