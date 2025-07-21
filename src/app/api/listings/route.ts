// @ts-nocheck - Temporary TypeScript disable during refactoring
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  const supabase = await createClient();
  
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching listings:', error);
      Sentry.captureException(error);
      return NextResponse.json(
        { error: 'Failed to fetch listings', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Unexpected error in GET /api/listings:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    console.log('Received listing data:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.title || !body.description || !body.price_per_day) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, price_per_day' },
        { status: 400 }
      );
    }

    // Get current user (you'll need to implement this based on your auth)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Prepare the listing data with correct field names for your database
    let addressString = '';
    if (body.address && typeof body.address === 'object') {
      // Build address string from object
      const addr = body.address;
      const parts = [
        addr.unitNumber,
        addr.streetNumber,
        addr.streetName,
        addr.suburb,
        addr.state,
        addr.postcode
      ].filter(Boolean);
      addressString = parts.join(' ');
    } else if (typeof body.address === 'string') {
      addressString = body.address;
    }

    const listingData = {
      title: body.title,
      description: body.description,
      category: body.category,
      price_per_day: body.price_per_day, // ✅ Correct field name
      price_weekly: body.price_weekly,
      deposit: body.deposit || 0, // ✅ Correct field name (not deposit_amount)
      images: body.images || [],
      features: body.features || [],
      condition: body.condition, // ✅ Required field
      address: addressString || body.city || 'Address not specified', // ✅ Text field
      city: body.city,
      state: body.state,
      country: body.country || 'Australia',
      postal_code: body.postal_code,
      brand: body.brand,
      model: body.model,
      year: body.year,
      delivery_available: body.delivery_available || false,
      pickup_available: body.pickup_available || true,
      insurance_enabled: body.insurance_enabled || false,
      owner_id: user.id, // ✅ Correct field name
      is_active: false, // Start as inactive until approved
      approval_status: 'pending'
    };

    // Handle location field (geography type) - REQUIRED field
    if (body.latitude && body.longitude) {
      listingData.location = `POINT(${body.longitude} ${body.latitude})`;
    } else {
      // Default location if coordinates not provided - use a default point (Sydney)
      listingData.location = 'POINT(151.2093 -33.8688)';
      console.warn('No coordinates provided, using default location (Sydney)');
    }

    console.log('Prepared listing data for database:', JSON.stringify(listingData, null, 2));

    const { data: listing, error } = await supabase
      .from('listings')
      .insert(listingData)
      .select()
      .single();

    if (error) {
      console.error('Database error creating listing:', error);
      Sentry.captureException(error, {
        extra: {
          listingData,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          errorMessage: error.message
        }
      });
      return NextResponse.json(
        { error: 'Failed to create listing', details: error },
        { status: 400 }
      );
    }

    console.log('Successfully created listing:', listing);
    return NextResponse.json({ listing }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/listings:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 