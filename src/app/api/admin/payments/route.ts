import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const status = searchParams.get('status') || 'all';
  const days = parseInt(searchParams.get('days') || '30');
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

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

    // Build query
    let query = supabase
      .from('payment_breakdowns')
      .select(`
        *,
        bookings!inner (
          id,
          status,
          payment_status,
          start_date,
          end_date,
          total_days,
          price_per_day,
          created_at,
          listings (
            title,
            category
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
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status !== 'all') {
      if (status === 'completed') {
        query = query.eq('bookings.status', 'completed');
      } else if (status === 'pending') {
        query = query.in('bookings.status', ['pending', 'confirmed']);
      } else if (status === 'failed') {
        query = query.eq('bookings.payment_status', 'failed');
      } else if (status === 'refunded') {
        query = query.eq('bookings.payment_status', 'refunded');
      }
    }

    // Apply search filter (this is a simplified version - in production you'd want full-text search)
    if (search) {
      // Note: This is a basic search implementation
      // For better search, consider using Supabase's full-text search or external search service
      query = query.or(`
        bookings.listings.title.ilike.%${search}%,
        bookings.profiles.full_name.ilike.%${search}%,
        bookings.owner_profile.full_name.ilike.%${search}%,
        bookings.profiles.email.ilike.%${search}%,
        bookings.owner_profile.email.ilike.%${search}%
      `);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // Transform data for frontend
    const transformedPayments = payments?.map(payment => ({
      id: payment.id,
      booking_id: payment.booking_id,
      listing_title: payment.bookings.listings?.title,
      listing_category: payment.bookings.listings?.category,
      renter_name: payment.bookings.profiles?.full_name,
      renter_email: payment.bookings.profiles?.email,
      owner_name: payment.bookings.owner_profile?.full_name,
      owner_email: payment.bookings.owner_profile?.email,
      start_date: payment.bookings.start_date,
      end_date: payment.bookings.end_date,
      total_days: payment.total_days,
      price_per_day: payment.base_price_per_day,
      subtotal: payment.subtotal,
      service_fee: payment.renter_service_fee_amount,
      commission: payment.owner_commission_amount,
      total_amount: payment.renter_total_amount,
      owner_earnings: payment.owner_net_earnings,
      platform_revenue: payment.platform_total_revenue,
      insurance_fee: payment.insurance_fee,
      security_deposit: payment.security_deposit,
      points_redeemed: payment.points_redeemed,
      points_credit_applied: payment.points_credit_applied,
      status: payment.bookings.status,
      payment_status: payment.bookings.payment_status,
      created_at: payment.created_at,
      booking_created_at: payment.bookings.created_at
    })) || [];

    // Get total count for pagination
    let countQuery = supabase
      .from('payment_breakdowns')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dateFrom.toISOString());

    if (status !== 'all') {
      if (status === 'completed') {
        countQuery = countQuery.eq('bookings.status', 'completed');
      } else if (status === 'pending') {
        countQuery = countQuery.in('bookings.status', ['pending', 'confirmed']);
      } else if (status === 'failed') {
        countQuery = countQuery.eq('bookings.payment_status', 'failed');
      } else if (status === 'refunded') {
        countQuery = countQuery.eq('bookings.payment_status', 'refunded');
      }
    }

    const { count } = await countQuery;

    return NextResponse.json({
      payments: transformedPayments,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        status,
        days,
        search
      }
    });

  } catch (error) {
    console.error('Error in admin payments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
