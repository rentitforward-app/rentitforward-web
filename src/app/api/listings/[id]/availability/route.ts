import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { CalendarAvailability } from '@/lib/calendar-utils';
import { addDays, format, parseISO } from 'date-fns';

// Validation schemas
const getAvailabilitySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateAvailabilitySchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  status: z.enum(['available', 'blocked']),
  reason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/listings/[id]/availability
 * Fetch availability data for a listing within a date range
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id: listingId } = await params; // Await params as required by Next.js 15+
    const url = new URL(request.url);
    
    // Parse and validate query parameters
    const queryParams = {
      startDate: url.searchParams.get('startDate') || format(new Date(), 'yyyy-MM-dd'),
      endDate: url.searchParams.get('endDate') || format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    };

    const validation = getAvailabilitySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid date parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { startDate, endDate } = validation.data;

    // Verify listing exists and user has access to view it
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, is_active, owner_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check if listing is active (for public access)
    if (!listing.is_active) {
      // Only owner can view inactive listings
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== listing.owner_id) {
        return NextResponse.json(
          { error: 'Listing not available' },
          { status: 403 }
        );
      }
    }

    // Get availability data using the database function
    const { data: availabilityData, error: availabilityError } = await supabase
      .rpc('get_listing_availability', {
        p_listing_id: listingId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (availabilityError) {
      console.error('Availability query error:', availabilityError);
      return NextResponse.json(
        { error: 'Failed to fetch availability data' },
        { status: 500 }
      );
    }

    // Transform data to match CalendarAvailability interface
    const availability: CalendarAvailability[] = (availabilityData || []).map((item: any) => ({
      date: item.date,
      status: item.status || 'available',
      bookingId: item.booking_id,
      blockedReason: item.blocked_reason,
    }));

    return NextResponse.json({
      listingId,
      dates: availability,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/listings/[id]/availability
 * Update availability for specific dates (owner only)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id: listingId } = await params; // Await params as required by Next.js 15+

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify listing ownership
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, owner_id')
      .eq('id', listingId)
      .eq('owner_id', user.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found or access denied' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateAvailabilitySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { dates, status, reason } = validation.data;

    // Prepare availability records
    const availabilityRecords = dates.map(date => ({
      listing_id: listingId,
      date,
      status,
      blocked_reason: status === 'blocked' ? reason : null,
      updated_at: new Date().toISOString(),
    }));

    // Insert or update availability records
    const { error: upsertError } = await supabase
      .from('listing_availability')
      .upsert(availabilityRecords, {
        onConflict: 'listing_id,date',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Availability update error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update availability' },
        { status: 500 }
      );
    }

    // If marking as available, remove any existing records
    if (status === 'available') {
      const { error: deleteError } = await supabase
        .from('listing_availability')
        .delete()
        .eq('listing_id', listingId)
        .in('date', dates);

      if (deleteError) {
        console.error('Error removing availability records:', deleteError);
        // Don't fail the request for this
      }
    }

    return NextResponse.json({
      success: true,
      updatedDates: dates,
      status,
    });

  } catch (error) {
    console.error('Availability update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/listings/[id]/availability
 * Remove availability blocks for specific dates (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const listingId = params.id;
    const url = new URL(request.url);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify listing ownership
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, owner_id')
      .eq('id', listingId)
      .eq('owner_id', user.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found or access denied' },
        { status: 404 }
      );
    }

    // Get dates to clear from query parameters
    const datesToClear = url.searchParams.getAll('date');
    
    if (datesToClear.length === 0) {
      return NextResponse.json(
        { error: 'No dates specified' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateValidation = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).safeParse(datesToClear);
    if (!dateValidation.success) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Remove availability blocks (only manual blocks, not bookings)
    const { error: deleteError } = await supabase
      .from('listing_availability')
      .delete()
      .eq('listing_id', listingId)
      .in('date', datesToClear)
      .is('booking_id', null); // Only remove manual blocks, not bookings

    if (deleteError) {
      console.error('Error removing availability blocks:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove availability blocks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clearedDates: datesToClear,
    });

  } catch (error) {
    console.error('Availability delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}