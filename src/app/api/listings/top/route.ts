import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '8');

  const supabase = await createClient();

  try {
    // Fetch top listings based on various criteria
    // For now, we'll use a mix of highest rated and most recently added
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        category,
        price_per_day,
        price_weekly,
        brand,
        model,
        condition,
        city,
        state,
        features,
        images,
        created_at,
        profiles:owner_id (
          full_name,
          rating,
          total_reviews
        )
      `)
      .eq('is_active', true)
      .not('price_per_day', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top listings:', error);
      return NextResponse.json({ error: 'Failed to fetch top listings' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const listings = (data || []).map(listing => ({
      id: listing.id,
      name: listing.title,
      category: listing.category,
      price: listing.price_per_day,
      weeklyPrice: listing.price_weekly,
      brand: listing.brand,
      model: listing.model,
      condition: listing.condition,
      location: `${listing.city}, ${listing.state}`,
      features: listing.features || [],
      image: listing.images && listing.images.length > 0 ? listing.images[0] : null,
      owner: {
        name: listing.profiles?.full_name || 'Anonymous',
        rating: listing.profiles?.rating || 4.5,
        reviews: listing.profiles?.total_reviews || 0
      },
      period: 'day'
    }));

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Error in top listings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 