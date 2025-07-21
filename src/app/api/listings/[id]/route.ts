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

    // Default coordinates for Perth, WA (will be improved with geocoding later)
    const defaultLat = -31.9505;
    const defaultLng = 115.8605;

    // Update listing with error handling
    const updateData = {
      title: listingData.title,
      description: listingData.description,
      category: listingData.category,
      price_per_day: listingData.price_per_day || listingData.dailyRate,
      price_hourly: listingData.price_hourly || listingData.hourlyRate || null,
      price_weekly: listingData.price_weekly || listingData.weeklyRate || null,
      deposit: listingData.deposit || listingData.securityDeposit || null,
      currency: 'AUD',
      condition: listingData.condition,
      brand: listingData.brand || null,
      model: listingData.model || null,
      year: listingData.year || null,
      features: listingData.features || [],
      images: listingData.images || [],
      location: `POINT(${defaultLng} ${defaultLat})`,
      address: addressString || listingData.location || '',
      city: listingData.city || (listingData.address?.suburb) || '',
      state: listingData.state || (listingData.address?.state) || null,
      postal_code: listingData.postal_code || listingData.postcode || (listingData.address?.postcode) || null,
      country: 'Australia',
      available_from: listingData.available_from ? new Date(listingData.available_from) : null,
      available_to: listingData.available_to ? new Date(listingData.available_to) : null,
      pickup_available: listingData.pickup_available !== false,
      delivery_available: listingData.delivery_available || false,
      insurance_enabled: listingData.insurance_enabled || false,
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