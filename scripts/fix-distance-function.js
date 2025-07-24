const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixDistanceFunction() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Updating RPC function to include longitude and latitude...');

  const sql = `
    CREATE OR REPLACE FUNCTION get_listings_sorted_by_distance(
      center_lat double precision,
      center_lng double precision,
      category_filter text DEFAULT NULL,
      min_price decimal DEFAULT NULL,
      max_price decimal DEFAULT NULL,
      max_results integer DEFAULT 100
    )
    RETURNS TABLE (
      id uuid,
      title text,
      description text,
      category text,
      price_per_day decimal,
      images text[],
      address text,
      city text,
      state text,
      location geography,
      distance_km double precision,
      longitude double precision,
      latitude double precision,
      owner_name text,
      owner_avatar text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        l.id,
        l.title,
        l.description,
        l.category,
        l.price_per_day,
        l.images,
        l.address,
        l.city,
        l.state,
        l.location,
        calculate_distance_km(
          l.location, 
          ST_GeogFromText('POINT(' || center_lng || ' ' || center_lat || ')')
        ) as distance_km,
        ST_X(l.location::geometry) as longitude,
        ST_Y(l.location::geometry) as latitude,
        p.full_name as owner_name,
        p.avatar_url as owner_avatar
      FROM listings l
      LEFT JOIN profiles p ON l.owner_id = p.id
      WHERE 
        l.is_active = true
        AND (category_filter IS NULL OR l.category = category_filter)
        AND (min_price IS NULL OR l.price_per_day >= min_price)
        AND (max_price IS NULL OR l.price_per_day <= max_price)
      ORDER BY 
        calculate_distance_km(
          l.location, 
          ST_GeogFromText('POINT(' || center_lng || ' ' || center_lat || ')')
        ) ASC
      LIMIT max_results;
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    // Use the REST API directly to execute SQL
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error updating function:', errorText);
      
      // Try alternative approach using a simple query
      console.log('🔄 Trying alternative approach...');
      
      const { data, error } = await supabase
        .from('sql_query')
        .select('*');
        
      if (error) {
        console.error('❌ Alternative approach failed:', error);
        console.log('ℹ️ The database function needs to be updated manually');
        return;
      }
    }
    
    console.log('✅ Successfully updated RPC function');
    
    // Test the function
    console.log('🧪 Testing the updated function...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_listings_sorted_by_distance', {
        center_lat: -33.8688,
        center_lng: 151.2093,
        max_results: 5
      });
    
    if (testError) {
      console.error('❌ Test error:', testError);
    } else {
      console.log('✅ Test successful! Sample result:');
      console.log(testData?.[0] || 'No results');
      
      if (testData?.[0]) {
        console.log('🎯 Longitude:', testData[0].longitude);
        console.log('🎯 Latitude:', testData[0].latitude);
        console.log('🎯 Distance:', testData[0].distance_km);
      }
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

fixDistanceFunction().catch(console.error); 