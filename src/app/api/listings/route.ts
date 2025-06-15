import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const state = searchParams.get('state');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const condition = searchParams.get('condition');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'newest';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createClient();

  try {
    let query = supabase
      .from('listings')
      .select(`
        *,
        profiles:owner_id (
          full_name,
          avatar_url
        )
      `)
      .eq('is_available', true);

    // Apply filters
    if (category) query = query.eq('category', category);
    if (state) query = query.eq('state', state);
    if (minPrice) query = query.gte('daily_rate', parseFloat(minPrice));
    if (maxPrice) query = query.lte('daily_rate', parseFloat(maxPrice));
    if (condition) query = query.eq('condition', condition);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        query = query.order('daily_rate', { ascending: true });
        break;
      case 'price_high':
        query = query.order('daily_rate', { ascending: false });
        break;
      case 'popular':
        query = query.order('view_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
    }

    return NextResponse.json({ listings: data || [] });
  } catch (error) {
    console.error('Error in listings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listingData = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'daily_rate', 'location', 'state', 'postcode', 'condition'];
    for (const field of requiredFields) {
      if (!listingData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    // Create listing
    const { data, error } = await supabase
      .from('listings')
      .insert({
        owner_id: user.id,
        title: listingData.title,
        description: listingData.description,
        category: listingData.category,
        subcategory: listingData.subcategory || null,
        daily_rate: listingData.daily_rate,
        weekly_rate: listingData.weekly_rate || null,
        monthly_rate: listingData.monthly_rate || null,
        deposit_amount: listingData.deposit_amount || 0,
        images: listingData.images || [],
        location: listingData.location,
        state: listingData.state,
        postcode: listingData.postcode,
        latitude: listingData.latitude || null,
        longitude: listingData.longitude || null,
        condition: listingData.condition,
        brand: listingData.brand || null,
        model: listingData.model || null,
        year: listingData.year || null,
        delivery_methods: listingData.delivery_methods || ['pickup'],
        features: listingData.features || [],
        rules: listingData.rules || [],
        tags: listingData.tags || [],
        is_available: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
    }

    // Create notification for nearby users (optional enhancement)
    // This could be implemented later to notify users in the same area

    return NextResponse.json({ listing: data }, { status: 201 });
  } catch (error) {
    console.error('Error in create listing API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 