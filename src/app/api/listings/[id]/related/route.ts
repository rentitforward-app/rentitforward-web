import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '6');

  // Await params for Next.js 15
  const resolvedParams = await params;
  const supabase = await createClient();

  try {
    // First get the current listing to determine category and location
    const { data: currentListing, error: currentError } = await supabase
      .from('listings')
      .select('category, state')
      .eq('id', resolvedParams.id)
      .single();

    if (currentError) {
      console.error('Error fetching current listing:', currentError);
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Get related listings based on same category and/or state
    const { data: relatedListings, error: relatedError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        price_per_day,
        images,
        location,
        state,
        condition,
        brand,
        model,
        profiles:owner_id (
          full_name,
          avatar_url
        )
      `)
      .neq('id', resolvedParams.id)
      .eq('is_active', true)
      .or(`category.eq.${currentListing.category},state.eq.${currentListing.state}`)
      .limit(limit);

    if (relatedError) {
      console.error('Error fetching related listings:', relatedError);
      return NextResponse.json({ error: 'Failed to fetch related listings' }, { status: 500 });
    }

    // Transform the data to match expected format
    const transformedListings = relatedListings.map(listing => ({
      ...listing,
      daily_rate: listing.price_per_day, // Map to expected field name
    }));

    return NextResponse.json({ listings: transformedListings });

  } catch (error) {
    console.error('Error in related listings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 