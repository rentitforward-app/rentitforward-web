import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    const { id } = await params;
    const { rating, comment }: { rating: number; comment?: string } = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: 'Rating must be between 1 and 5' 
      }, { status: 400 });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!inner(id, title, owner_id),
        renter_profile:renter_id(id, full_name, email),
        owner_profile:owner_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user is involved in this booking
    if (booking.renter_id !== user.id && booking.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Reviews can only be submitted for completed bookings' 
      }, { status: 400 });
    }

    // Determine reviewer and reviewee
    const isRenter = booking.renter_id === user.id;
    const revieweeId = isRenter ? booking.owner_id : booking.renter_id;
    const reviewType = isRenter ? 'renter_to_owner' : 'owner_to_renter';

    // Check if user has already reviewed this booking
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', id)
      .eq('reviewer_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json({ 
        error: 'You have already reviewed this booking' 
      }, { status: 400 });
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        booking_id: id,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating: rating,
        comment: comment?.trim() || null,
        type: reviewType,
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Error creating review:', reviewError);
      return NextResponse.json({ 
        error: 'Failed to submit review' 
      }, { status: 500 });
    }

    // Update user ratings
    try {
      // Get all reviews for the reviewee to calculate new average
      const { data: allReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId);

      if (!reviewsError && allReviews) {
        const totalReviews = allReviews.length;
        const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
        
        // Update the reviewee's profile
        await supabase
          .from('profiles')
          .update({
            rating: Number(averageRating.toFixed(1)),
            total_reviews: totalReviews,
            updated_at: new Date().toISOString(),
          })
          .eq('id', revieweeId);
      }

      // Update listing rating if reviewing the owner
      if (!isRenter) {
        const { data: listingReviews, error: listingReviewsError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('booking_id', id);

        if (!listingReviewsError && listingReviews) {
          const listingRating = listingReviews.reduce((sum, r) => sum + r.rating, 0) / listingReviews.length;
          
          await supabase
            .from('listings')
            .update({
              rating: Number(listingRating.toFixed(1)),
              review_count: listingReviews.length,
              updated_at: new Date().toISOString(),
            })
            .eq('id', booking.listings.id);
        }
      }
    } catch (ratingError) {
      console.error('Error updating ratings:', ratingError);
      // Don't fail the review submission if rating update fails
    }

    // Send notifications
    try {
      const { fcmAdminService } = await import('@/lib/fcm/admin');
      
      const reviewerName = isRenter ? booking.renter_profile.full_name : booking.owner_profile.full_name;
      const revieweeName = isRenter ? booking.owner_profile.full_name : booking.renter_profile.full_name;

      // Create in-app notification for the reviewee
      await supabase
        .from('app_notifications')
        .insert({
          user_id: revieweeId,
          type: 'review_received',
          title: `New Review Received! ${('⭐'.repeat(rating))}`,
          message: `${reviewerName} left you a ${rating}-star review for "${booking.listings.title}"${comment ? ': "' + comment.substring(0, 100) + (comment.length > 100 ? '..."' : '"') : '.'}`,
          action_url: `/profile/${revieweeId}`,
          data: {
            booking_id: id,
            review_id: review.id,
            rating: rating,
            reviewer_name: reviewerName,
            listing_title: booking.listings.title,
          },
          priority: 6,
        });

      // Send FCM push notification
      const revieweeTokens = await fcmAdminService.getUserFCMTokens(revieweeId);
      if (revieweeTokens.length > 0) {
        await fcmAdminService.sendToTokens(
          revieweeTokens.map(t => t.token),
          {
            notification: {
              title: `New ${rating}-Star Review! ⭐`,
              body: `${reviewerName} reviewed your rental of "${booking.listings.title}"`,
              icon: '/icons/notification-icon-192.png',
            },
            data: {
              type: 'review_received',
              booking_id: id,
              review_id: review.id,
              action_url: `/profile/${revieweeId}`,
            },
          }
        );
      }
    } catch (notificationError) {
      console.error('Failed to send review notifications:', notificationError);
    }

    // Send review notification email
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
      
      const emailData = {
        booking_id: id,
        review_id: review.id,
        listing_title: booking.listings.title,
        reviewer_name: isRenter ? booking.renter_profile.full_name : booking.owner_profile.full_name,
        reviewee_name: isRenter ? booking.owner_profile.full_name : booking.renter_profile.full_name,
        reviewee_email: isRenter ? booking.owner_profile.email : booking.renter_profile.email,
        rating: rating,
        comment: comment || null,
        base_url: baseUrl,
      };

      await unifiedEmailService.sendReviewReceivedEmail(emailData);
    } catch (emailError) {
      console.error('Failed to send review email:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Review submitted successfully',
      review_id: review.id,
      rating: rating,
    });

  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
