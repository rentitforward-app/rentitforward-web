import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  try {
    // Check authentication and admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.email === 'admin@rentitforward.com' || 
                   userProfile?.email === 'rentitforward.app@gmail.com';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get payment analytics from payment_breakdowns table
    const { data: analytics, error: analyticsError } = await supabase
      .from('payment_breakdowns')
      .select(`
        *,
        bookings!inner (
          id,
          status,
          created_at,
          listings (
            title
          ),
          profiles:renter_id (
            full_name,
            email
          ),
          owner_profile:owner_id (
            full_name,
            email
          )
        )
      `)
      .gte('created_at', dateFrom.toISOString())
      .eq('bookings.status', 'completed'); // Only completed bookings for revenue

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Calculate totals
    const totalRevenue = analytics?.reduce((sum, item) => sum + item.platform_total_revenue, 0) || 0;
    const totalBookings = analytics?.length || 0;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const totalCommission = analytics?.reduce((sum, item) => sum + item.owner_commission_amount, 0) || 0;
    const totalServiceFees = analytics?.reduce((sum, item) => sum + item.renter_service_fee_amount, 0) || 0;

    // Get unique user counts
    const uniqueRenters = new Set(analytics?.map(item => item.bookings.profiles?.email).filter(Boolean)).size;
    const uniqueOwners = new Set(analytics?.map(item => item.bookings.owner_profile?.email).filter(Boolean)).size;

    // Get recent payments (last 10)
    const recentPayments = analytics
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        booking_id: item.booking_id,
        listing_title: item.bookings.listings?.title,
        renter_name: item.bookings.profiles?.full_name,
        owner_name: item.bookings.owner_profile?.full_name,
        total_amount: item.renter_total_amount,
        platform_revenue: item.platform_total_revenue,
        created_at: item.created_at
      })) || [];

    return NextResponse.json({
      total_revenue: totalRevenue,
      total_bookings: totalBookings,
      average_booking_value: averageBookingValue,
      total_commission: totalCommission,
      total_service_fees: totalServiceFees,
      active_renters: uniqueRenters,
      active_owners: uniqueOwners,
      recent_payments: recentPayments,
      date_range: {
        from: dateFrom.toISOString(),
        to: new Date().toISOString(),
        days
      }
    });

  } catch (error) {
    console.error('Error in payment analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

