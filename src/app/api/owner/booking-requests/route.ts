/**
 * GET /api/owner/booking-requests
 * 
 * Fetch booking requests for the owner dashboard
 * Supports filtering by status, urgency, and deadline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  filter: z.enum(['all', 'pending', 'urgent', 'expired']).default('pending'),
  limit: z.string().transform(Number).default('20'),
  offset: z.string().transform(Number).default('0'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user (must be authenticated)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const validation = querySchema.safeParse({
      filter: searchParams.get('filter'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { filter, limit, offset } = validation.data;

    // Base query for bookings where user is the owner
    let query = supabase
      .from('bookings')
      .select(`
        id,
        renter_id,
        listing_id,
        start_date,
        end_date,
        duration,
        daily_rate,
        rental_fee,
        service_fee,
        insurance_fee,
        security_deposit,
        total_amount,
        points_used,
        credit_applied,
        include_insurance,
        status,
        notes,
        approval_deadline,
        created_at,
        hold_expires_at,
        tentative_hold,
        listings!inner(
          id,
          title,
          images,
          owner_id
        ),
        profiles!renter_id(
          id,
          name,
          email,
          avatar_url,
          verified
        )
      `)
      .eq('listings.owner_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    switch (filter) {
      case 'pending':
        query = query.in('status', ['pending', 'pending_payment']);
        break;
      case 'urgent':
        // Requests expiring within 6 hours
        const urgentDeadline = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
        query = query
          .in('status', ['pending', 'pending_payment'])
          .lte('approval_deadline', urgentDeadline)
          .gte('approval_deadline', new Date().toISOString());
        break;
      case 'expired':
        // Requests past their deadline
        query = query
          .in('status', ['pending', 'pending_payment'])
          .lt('approval_deadline', new Date().toISOString());
        break;
      case 'all':
        // No additional filter
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: bookings, error: bookingError } = await query;

    if (bookingError) {
      console.error('Failed to fetch booking requests:', bookingError);
      return NextResponse.json(
        { error: 'Failed to fetch booking requests', details: bookingError },
        { status: 500 }
      );
    }

    // Get user ratings for each renter (optional enhancement)
    const renterIds = [...new Set(bookings?.map(b => b.renter_id) || [])];
    const { data: ratings } = await supabase
      .from('user_reviews')
      .select('user_id, avg_rating')
      .in('user_id', renterIds);

    // Combine booking data with ratings
    const enrichedBookings = bookings?.map(booking => ({
      ...booking,
      profiles: {
        ...booking.profiles,
        rating: ratings?.find(r => r.user_id === booking.renter_id)?.avg_rating || null,
      },
    })) || [];

    return NextResponse.json(enrichedBookings);

  } catch (error) {
    console.error('Owner booking requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}