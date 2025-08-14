import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/bookings/expire
 * Manually trigger expiration of payment_required bookings
 * This can be called by a cron job or monitoring system
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Call the database function to expire bookings
    const { data: expiredCount, error } = await supabase
      .rpc('expire_payment_required_bookings');

    if (error) {
      console.error('Error expiring bookings:', error);
      return NextResponse.json(
        { error: 'Failed to expire bookings' },
        { status: 500 }
      );
    }

    console.log(`✅ Expired ${expiredCount || 0} payment_required bookings`);

    return NextResponse.json({
      success: true,
      expiredCount: expiredCount || 0,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Booking expiration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings/expire
 * Check how many bookings are eligible for expiration (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Count bookings that would be expired
    const { data: eligibleBookings, error } = await supabase
      .from('bookings')
      .select('id, expires_at, created_at')
      .eq('status', 'payment_required')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error checking eligible bookings:', error);
      return NextResponse.json(
        { error: 'Failed to check eligible bookings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      eligibleCount: eligibleBookings?.length || 0,
      eligibleBookings: eligibleBookings || [],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Booking expiration check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
