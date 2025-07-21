import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();

  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles:owner_id (
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching listing:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('Error in listing GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if listing exists and user owns it
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      console.error('Error checking listing ownership:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to verify listing' }, { status: 500 });
    }

    if (existingListing.owner_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own listings' }, { status: 403 });
    }

    const listingData = await request.json();
    console.log('Received listing update data:', listingData);

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

    // Update listing with correct database field names from schema
    const updateData = {
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
      delivery_methods: listingData.delivery_available ? ['delivery', 'pickup'] : ['pickup'],
    };

    console.log('Updating listing with data:', updateData);

    const { data, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating listing:', error);
      return NextResponse.json({ 
        error: 'Failed to update listing', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('Successfully updated listing:', data);
    return NextResponse.json({ listing: data });
  } catch (error) {
    console.error('Error in update listing API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 