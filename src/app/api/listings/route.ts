// @ts-nocheck - Temporary TypeScript disable during refactoring
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
      .eq('is_active', true);

    // Apply filters
    if (category) query = query.eq('category', category);
    if (state) query = query.eq('state', state);
    if (minPrice) query = query.gte('price_per_day', parseFloat(minPrice));
    if (maxPrice) query = query.lte('price_per_day', parseFloat(maxPrice));
    if (condition) query = query.eq('condition', condition);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_low':
        query = query.order('price_per_day', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price_per_day', { ascending: false });
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
    console.log('Received listing data:', listingData);

    // Validate required fields (based on actual database schema)
    const requiredFields = ['title', 'description', 'category', 'price_per_day', 'condition'];
    for (const field of requiredFields) {
      if (!listingData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    // Build address string if address object is provided
    let addressString = '';
    if (listingData.address && typeof listingData.address === 'object') {
      const addr = listingData.address;
      const parts = [
        addr.unitNumber,
        addr.streetNumber,
        addr.streetName,
        addr.suburb,
        addr.state,
        addr.postcode
      ].filter(Boolean);
      addressString = parts.join(' ');
    } else if (typeof listingData.address === 'string') {
      addressString = listingData.address;
    }

    // Create listing with EXACT database field names from schema
    const insertData = {
        owner_id: user.id,
        title: listingData.title,
        description: listingData.description,
        category: listingData.category,
        daily_rate: listingData.price_per_day || listingData.dailyRate,
        weekly_rate: listingData.price_weekly || listingData.weeklyRate || null,
        monthly_rate: listingData.price_monthly || listingData.monthlyRate || null,
        deposit_amount: listingData.deposit || listingData.securityDeposit || 0,
        condition: listingData.condition,
        brand: listingData.brand || null,
        model: listingData.model || null,
        year: listingData.year || null,
        features: listingData.features || [],
        images: listingData.images || [],
        location: addressString || 'Location not specified', // Required field from schema
        state: listingData.state || (listingData.address?.state) || 'Unknown',
        postcode: listingData.postal_code || listingData.postcode || (listingData.address?.postcode) || '0000',
        latitude: null, // Could be added later with geocoding
        longitude: null, // Could be added later with geocoding
        is_available: true, // Changed to true so listings are immediately available
        delivery_methods: listingData.delivery_available ? ['delivery', 'pickup'] : ['pickup'],
    };

    console.log('Inserting data with correct schema fields:', insertData);

    // Create listing
    const { data, error } = await supabase
      .from('listings')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating listing:', error);
      console.error('Failed insert data was:', insertData);
      return NextResponse.json({ 
        error: 'Failed to create listing', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('Successfully created listing:', data);
    return NextResponse.json({ listing: data }, { status: 201 });
  } catch (error) {
    console.error('Error in create listing API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
} 