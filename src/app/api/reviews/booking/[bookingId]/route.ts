import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: { bookingId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, renter_id, owner_id, status')
      .eq('id', params.bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user is part of this booking
    const isAuthorized = booking.renter_id === user.id || booking.owner_id === user.id;
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all reviews for this booking
    const { data: reviews, error: reviewsError } = await supabase
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
        )
      `)
      .eq('booking_id', params.bookingId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Determine review eligibility
    const canRenterReview = booking.status === 'completed' && 
      booking.renter_id === user.id &&
      !reviews?.find(r => r.type === 'renter_to_owner');

    const canOwnerReview = booking.status === 'completed' && 
      booking.owner_id === user.id &&
      !reviews?.find(r => r.type === 'owner_to_renter');

    return NextResponse.json({
      reviews: reviews || [],
      booking: {
        id: booking.id,
        status: booking.status,
        canRenterReview,
        canOwnerReview,
        userRole: booking.renter_id === user.id ? 'renter' : 'owner'
      }
    });

  } catch (error) {
    console.error('Error in booking reviews GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 