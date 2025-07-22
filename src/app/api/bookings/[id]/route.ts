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

    // Get booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings (
          title,
          images,
          category,
          price_per_day,
          owner_id
        ),
        profiles:renter_id (
          full_name,
          avatar_url
        ),
        owner_profile:owner_id (
          full_name,
          avatar_url
        )
      `)
      .eq('id', params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user has access to this booking
    const hasAccess = booking.renter_id === user.id || booking.owner_id === user.id;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine review eligibility
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('id, type')
      .eq('booking_id', params.id);

    const canRenterReview = booking.status === 'completed' && 
      booking.renter_id === user.id &&
      !existingReviews?.find(r => r.type === 'renter_to_owner');

    const canOwnerReview = booking.status === 'completed' && 
      booking.owner_id === user.id &&
      !existingReviews?.find(r => r.type === 'owner_to_renter');

    return NextResponse.json({
      booking: {
        ...booking,
        canRenterReview,
        canOwnerReview,
        userRole: booking.renter_id === user.id ? 'renter' : 'owner'
      }
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Get current booking
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, renter_id, owner_id, status')
      .eq('id', params.id)
      .single();

    if (fetchError || !currentBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check authorization for status changes
    const canUpdate = await checkUpdatePermission(currentBooking, user.id, updates);
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Track if status is changing to completed for review notifications
    const wasNotCompleted = currentBooking.status !== 'completed';
    const isBecomingCompleted = updates.status === 'completed';

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        listings (
          title,
          images,
          category,
          price_per_day
        ),
        profiles:renter_id (
          full_name,
          avatar_url
        ),
        owner_profile:owner_id (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    // If booking just became completed, trigger review eligibility
    if (wasNotCompleted && isBecomingCompleted) {
      await handleBookingCompletion(supabase, updatedBooking);
    }

    return NextResponse.json({ booking: updatedBooking });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to check update permissions
async function checkUpdatePermission(booking: any, userId: string, updates: any): Promise<boolean> {
  const isRenter = booking.renter_id === userId;
  const isOwner = booking.owner_id === userId;

  if (!isRenter && !isOwner) {
    return false;
  }

  // Define allowed status transitions for each role
  const allowedTransitions: Record<string, { renter: string[], owner: string[] }> = {
    'pending': {
      renter: ['cancelled'],
      owner: ['confirmed', 'cancelled']
    },
    'confirmed': {
      renter: ['cancelled'],
      owner: ['active', 'cancelled']
    },
    'active': {
      renter: [],
      owner: ['completed']
    },
    'completed': {
      renter: [],
      owner: []
    }
  };

  // Check if status change is allowed
  if (updates.status) {
    const allowed = allowedTransitions[booking.status];
    if (!allowed) return false;

    const userAllowed = isRenter ? allowed.renter : allowed.owner;
    if (!userAllowed.includes(updates.status)) {
      return false;
    }
  }

  return true;
}

// Helper function to handle booking completion and review eligibility
async function handleBookingCompletion(supabase: any, booking: any): Promise<void> {
  try {
    console.log(`Booking ${booking.id} completed - triggering review eligibility`);

    // Import notification helpers (dynamic import to avoid SSR issues)
    const { createReviewRequestNotifications } = await import('@/lib/notifications');

    // Create review request notifications for both parties
    const result = await createReviewRequestNotifications(booking);
    
    if (result.renterNotified && result.ownerNotified) {
      console.log(`✅ Review request notifications sent successfully for booking ${booking.id}`);
    } else {
      console.warn(`⚠️ Some review notifications failed for booking ${booking.id}:`, result);
    }

    console.log(`Review eligibility enabled for booking ${booking.id}:`);
    console.log(`- Renter (${booking.renter_id}) can review owner`);
    console.log(`- Owner (${booking.owner_id}) can review renter`);

  } catch (error) {
    console.error('Error handling booking completion:', error);
    // Don't throw error to avoid blocking the booking update
  }
} 