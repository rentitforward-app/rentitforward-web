/**
 * GET /api/owner/dashboard-stats
 * 
 * Fetch dashboard statistics for owners
 * - Pending booking count
 * - Monthly revenue
 * - Average response time
 * - Approval rate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, differenceInHours } from 'date-fns';

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

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get pending bookings count
    const { count: pendingCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .in('status', ['pending', 'pending_payment']);

    // Get monthly revenue (confirmed bookings this month)
    const { data: monthlyBookings } = await supabase
      .from('bookings')
      .select('rental_fee, status, owner_response_at')
      .eq('owner_id', user.id)
      .eq('status', 'confirmed')
      .gte('owner_response_at', monthStart.toISOString())
      .lte('owner_response_at', monthEnd.toISOString());

    const monthlyRevenue = monthlyBookings?.reduce((total, booking) => {
      // Owner gets 80% after 20% platform commission
      return total + (booking.rental_fee * 0.8);
    }, 0) || 0;

    // Calculate average response time for bookings responded to this month
    const { data: respondedBookings } = await supabase
      .from('bookings')
      .select('created_at, owner_response_at')
      .eq('owner_id', user.id)
      .not('owner_response_at', 'is', null)
      .gte('owner_response_at', monthStart.toISOString())
      .lte('owner_response_at', monthEnd.toISOString());

    let averageResponseTime = 0;
    if (respondedBookings && respondedBookings.length > 0) {
      const totalResponseTime = respondedBookings.reduce((total, booking) => {
        const responseTime = differenceInHours(
          new Date(booking.owner_response_at!),
          new Date(booking.created_at)
        );
        return total + responseTime;
      }, 0);
      averageResponseTime = Math.round(totalResponseTime / respondedBookings.length);
    }

    // Calculate approval rate (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('status')
      .eq('owner_id', user.id)
      .not('owner_response_at', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString());

    let approvalRate = 0;
    if (recentBookings && recentBookings.length > 0) {
      const approvedCount = recentBookings.filter(b => b.status === 'confirmed').length;
      approvalRate = Math.round((approvedCount / recentBookings.length) * 100);
    }

    return NextResponse.json({
      pendingBookings: pendingCount || 0,
      totalRevenue: monthlyRevenue,
      averageResponseTime,
      approvalRate,
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}