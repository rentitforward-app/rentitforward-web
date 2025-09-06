import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    // Await params
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking with payment breakdown
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
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
          avatar_url,
          email
        ),
        owner_profile:owner_id (
          full_name,
          avatar_url,
          email
        ),
        payment_breakdowns (
          *
        ),
        payment_transactions (
          *
        )
      `)
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user has permission to view this booking
    const isRenter = booking.renter_id === user.id;
    const isOwner = booking.owner_id === user.id;
    
    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.email === 'admin@rentitforward.com' || 
                   userProfile?.email === 'rentitforward.app@gmail.com';

    if (!isRenter && !isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Determine view type
    let viewType: 'renter' | 'owner' | 'admin' = 'renter';
    if (isAdmin) {
      viewType = 'admin';
    } else if (isOwner) {
      viewType = 'owner';
    }

    // Get user points if renter
    let userPoints = null;
    if (isRenter || isAdmin) {
      const { data: points } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', booking.renter_id)
        .single();
      userPoints = points;
    }

    // Get points transactions for this booking
    const { data: pointsTransactions } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('booking_id', id);

    return NextResponse.json({
      booking,
      payment_breakdown: booking.payment_breakdowns?.[0] || null,
      payment_transactions: booking.payment_transactions || [],
      points_transactions: pointsTransactions || [],
      user_points: userPoints,
      view_type: viewType,
      permissions: {
        is_renter: isRenter,
        is_owner: isOwner,
        is_admin: isAdmin
      }
    });

  } catch (error) {
    console.error('Error fetching payment breakdown:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
