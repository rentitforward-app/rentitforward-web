import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ReviewResponseSchema } from '@/shared';

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const responseData = ReviewResponseSchema.parse(body);
    const reviewId = params.id;

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the review to verify the user is the reviewee
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('reviewee_id, response')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user is the reviewee (person being reviewed)
    if (review.reviewee_id !== user.id) {
      return NextResponse.json({ 
        error: 'Only the person being reviewed can respond' 
      }, { status: 403 });
    }

    // Check if response already exists
    if (review.response) {
      return NextResponse.json({ 
        error: 'Response already exists for this review' 
      }, { status: 409 });
    }

    // Create the response object
    const responseObject = {
      comment: responseData.comment,
      createdAt: new Date().toISOString()
    };

    // Update the review with the response
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({ 
        response: responseObject,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
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
      console.error('Error adding review response:', updateError);
      return NextResponse.json({ error: 'Failed to add response' }, { status: 500 });
    }

    // Send notification to the reviewer about the response
    try {
      const { createReviewResponseNotification } = await import('@/lib/notifications');
      await createReviewResponseNotification(
        updatedReview.reviewer_id,
        reviewId,
        updatedReview.reviewee.full_name || 'Someone'
      );
    } catch (notificationError) {
      console.error('Error sending response notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ review: updatedReview }, { status: 201 });

  } catch (error) {
    console.error('Error in review response POST:', error);
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { comment } = body;
    const reviewId = params.id;

    if (!comment || typeof comment !== 'string' || comment.length > 500) {
      return NextResponse.json({ error: 'Invalid comment' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the review to verify the user is the reviewee and response exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('reviewee_id, response')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user is the reviewee
    if (review.reviewee_id !== user.id) {
      return NextResponse.json({ 
        error: 'Only the person being reviewed can update the response' 
      }, { status: 403 });
    }

    // Check if response exists
    if (!review.response) {
      return NextResponse.json({ 
        error: 'No response exists to update' 
      }, { status: 404 });
    }

    // Check if response is editable (within 24 hours)
    const responseCreatedAt = new Date(review.response.createdAt);
    const now = new Date();
    const hoursSinceResponse = (now.getTime() - responseCreatedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceResponse > 24) {
      return NextResponse.json({ 
        error: 'Response can only be edited within 24 hours' 
      }, { status: 403 });
    }

    // Update the response
    const updatedResponseObject = {
      ...review.response,
      comment,
      editedAt: new Date().toISOString()
    };

    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({ 
        response: updatedResponseObject,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
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
      console.error('Error updating review response:', updateError);
      return NextResponse.json({ error: 'Failed to update response' }, { status: 500 });
    }

    return NextResponse.json({ review: updatedReview });

  } catch (error) {
    console.error('Error in review response PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const reviewId = params.id;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the review to verify the user is the reviewee and response exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('reviewee_id, response')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user is the reviewee
    if (review.reviewee_id !== user.id) {
      return NextResponse.json({ 
        error: 'Only the person being reviewed can delete the response' 
      }, { status: 403 });
    }

    // Check if response exists
    if (!review.response) {
      return NextResponse.json({ 
        error: 'No response exists to delete' 
      }, { status: 404 });
    }

    // Check if response is deletable (within 1 hour)
    const responseCreatedAt = new Date(review.response.createdAt);
    const now = new Date();
    const hoursSinceResponse = (now.getTime() - responseCreatedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceResponse > 1) {
      return NextResponse.json({ 
        error: 'Response can only be deleted within 1 hour' 
      }, { status: 403 });
    }

    // Remove the response
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({ 
        response: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
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
      console.error('Error deleting review response:', updateError);
      return NextResponse.json({ error: 'Failed to delete response' }, { status: 500 });
    }

    return NextResponse.json({ review: updatedReview });

  } catch (error) {
    console.error('Error in review response DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 