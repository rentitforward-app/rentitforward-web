import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  
  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }
      console.error('Database error fetching listing:', error);
      Sentry.captureException(error);
      return NextResponse.json(
        { error: 'Failed to fetch listing', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('Unexpected error in GET /api/listings/[id]:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    console.log('Received listing update data:', JSON.stringify(body, null, 2));

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (existingListing.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this listing' },
        { status: 403 }
      );
    }

    // Prepare the update data with correct field names for your database
    const updateData: any = {};

    // Handle address field conversion
    if (body.address) {
      let addressString = '';
      if (typeof body.address === 'object') {
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
      updateData.address = addressString || body.city || 'Address not specified';
    }

    // Handle other fields
    if (body.title) updateData.title = body.title;
    if (body.description) updateData.description = body.description;
    if (body.category) updateData.category = body.category;
    if (body.price_per_day) updateData.price_per_day = body.price_per_day; // ✅ Correct field name
    if (body.price_weekly) updateData.price_weekly = body.price_weekly;
    if (body.deposit !== undefined) updateData.deposit = body.deposit; // ✅ Correct field name (not deposit_amount)
    if (body.images) updateData.images = body.images;
    if (body.features) updateData.features = body.features;
    if (body.condition) updateData.condition = body.condition;
    if (body.city) updateData.city = body.city;
    if (body.state) updateData.state = body.state;
    if (body.country) updateData.country = body.country;
    if (body.postal_code) updateData.postal_code = body.postal_code;
    if (body.brand) updateData.brand = body.brand;
    if (body.model) updateData.model = body.model;
    if (body.year) updateData.year = body.year;
    if (body.delivery_available !== undefined) updateData.delivery_available = body.delivery_available;
    if (body.pickup_available !== undefined) updateData.pickup_available = body.pickup_available;
    if (body.insurance_enabled !== undefined) updateData.insurance_enabled = body.insurance_enabled;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    updateData.updated_at = new Date().toISOString();

    // Handle location field (geography type) - create from coordinates if provided
    if (body.latitude && body.longitude) {
      updateData.location = `POINT(${body.longitude} ${body.latitude})`;
    }

    console.log('Prepared update data for database:', JSON.stringify(updateData, null, 2));

    const { data: listing, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating listing:', error);
      Sentry.captureException(error, {
        extra: {
          updateData,
          listingId: params.id,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          errorMessage: error.message
        }
      });
      return NextResponse.json(
        { error: 'Failed to update listing', details: error },
        { status: 400 }
      );
    }

    console.log('Successfully updated listing:', listing);
    return NextResponse.json({ listing });

  } catch (error) {
    console.error('Unexpected error in PUT /api/listings/[id]:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (existingListing.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this listing' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Database error deleting listing:', error);
      Sentry.captureException(error);
      return NextResponse.json(
        { error: 'Failed to delete listing', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Listing deleted successfully' });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/listings/[id]:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 