import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Cleanup expired bookings with payment_required status
 * This helps maintain data hygiene and frees up blocked dates
 * Can be called via cron job or manually
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all expired bookings that are still in payment_required status
    const { data: expiredBookings, error: selectError } = await supabase
      .from('bookings')
      .select('id, listing_id, start_date, end_date, created_at')
      .eq('status', 'payment_required')
      .lt('expires_at', new Date().toISOString());

    if (selectError) {
      console.error('Error selecting expired bookings:', selectError);
      return NextResponse.json({ error: 'Failed to select expired bookings' }, { status: 500 });
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      return NextResponse.json({ 
        message: 'No expired bookings found',
        cleaned: 0 
      });
    }

    console.log(`Found ${expiredBookings.length} expired bookings to clean up`);

    // Delete expired bookings
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('status', 'payment_required')
      .lt('expires_at', new Date().toISOString());

    if (deleteError) {
      console.error('Error deleting expired bookings:', deleteError);
      return NextResponse.json({ error: 'Failed to delete expired bookings' }, { status: 500 });
    }

    console.log(`Successfully cleaned up ${expiredBookings.length} expired bookings`);

    return NextResponse.json({
      message: 'Expired bookings cleaned up successfully',
      cleaned: expiredBookings.length,
      bookings: expiredBookings.map(b => ({
        id: b.id,
        listing_id: b.listing_id,
        date_range: `${b.start_date} to ${b.end_date}`,
        created_at: b.created_at
      }))
    });

  } catch (error) {
    console.error('Error in cleanup-expired API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get information about expired bookings without deleting them
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all expired bookings that are still in payment_required status
    const { data: expiredBookings, error } = await supabase
      .from('bookings')
      .select('id, listing_id, start_date, end_date, created_at, expires_at')
      .eq('status', 'payment_required')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching expired bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch expired bookings' }, { status: 500 });
    }

    return NextResponse.json({
      expired_bookings: expiredBookings || [],
      count: expiredBookings?.length || 0
    });

  } catch (error) {
    console.error('Error in cleanup-expired GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
