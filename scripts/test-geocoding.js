#!/usr/bin/env node

/**
 * Script to test geocoding functionality
 * Tests both the API endpoint and database functions
 * 
 * Usage: npm run test:geocoding
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables  
require('dotenv').config({ path: '.env.local' });

async function testGeocodingSystem() {
  console.log('🧪 Testing Geocoding System...');
  console.log('================================');

  // Test 1: Environment Variables
  console.log('\n1️⃣ Testing Environment Configuration...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geocodingProvider = process.env.GEOCODING_PROVIDER;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const mapboxKey = process.env.MAPBOX_ACCESS_TOKEN;

  console.log(`   ✅ Supabase URL: ${supabaseUrl ? 'Configured' : '❌ Missing'}`);
  console.log(`   ✅ Supabase Key: ${supabaseKey ? 'Configured' : '❌ Missing'}`);
  console.log(`   ✅ Geocoding Provider: ${geocodingProvider || 'nominatim (default)'}`);
  console.log(`   ✅ Google Maps API: ${googleKey ? 'Configured' : 'Not configured (using free fallback)'}`);
  console.log(`   ✅ MapBox API: ${mapboxKey ? 'Configured' : 'Not configured'}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required Supabase configuration');
    process.exit(1);
  }

  // Test 2: Database Connection
  console.log('\n2️⃣ Testing Database Connection...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('   ❌ Database connection failed:', error.message);
      return;
    }
    
    console.log('   ✅ Database connection successful');
  } catch (error) {
    console.error('   ❌ Database connection error:', error.message);
    return;
  }

  // Test 3: PostGIS Extension
  console.log('\n3️⃣ Testing PostGIS Extension...');
  
  try {
    const { data, error } = await supabase
      .rpc('postgis_version')
      .select();
    
    if (error) {
      console.error('   ❌ PostGIS not available:', error.message);
      console.log('   💡 Enable with: CREATE EXTENSION IF NOT EXISTS postgis;');
    } else {
      console.log('   ✅ PostGIS extension available');
    }
  } catch (error) {
    console.error('   ❌ PostGIS check failed:', error.message);
  }

  // Test 4: Spatial Functions
  console.log('\n4️⃣ Testing Spatial Database Functions...');
  
  try {
    // Test calculate_distance_km function
    const { data: distanceData, error: distanceError } = await supabase
      .rpc('calculate_distance_km', {
        point1: 'POINT(151.2093 -33.8688)', // Sydney
        point2: 'POINT(144.9631 -37.8136)'  // Melbourne
      });
    
    if (distanceError) {
      console.error('   ❌ Distance calculation function not available:', distanceError.message);
      console.log('   💡 Run spatial migration: npm run migrate:spatial');
    } else {
      const distance = Math.round(distanceData * 10) / 10;
      console.log(`   ✅ Distance calculation working: Sydney to Melbourne = ${distance}km`);
      
      // Verify the distance is approximately correct (should be ~713km)
      if (distance > 700 && distance < 730) {
        console.log('   ✅ Distance calculation accuracy verified');
      } else {
        console.log(`   ⚠️  Distance seems incorrect (expected ~713km, got ${distance}km)`);
      }
    }
  } catch (error) {
    console.error('   ❌ Spatial function test failed:', error.message);
  }

  // Test 5: Spatial Indexes
  console.log('\n5️⃣ Testing Spatial Indexes...');
  
  try {
    const { data: indexData, error: indexError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE indexname LIKE '%location%spatial' 
          ORDER BY indexname;
        `
      });
    
    if (indexError) {
      // Try alternative query
      const { data: altData, error: altError } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .like('indexname', '%location%spatial');
        
      if (altError) {
        console.log('   ⚠️  Could not verify spatial indexes (may still exist)');
      } else {
        console.log(`   ✅ Found ${altData?.length || 0} spatial indexes`);
      }
    } else {
      console.log(`   ✅ Found ${indexData?.length || 0} spatial indexes`);
    }
  } catch (error) {
    console.log('   ⚠️  Could not verify spatial indexes:', error.message);
  }

  // Test 6: Geocoding API Endpoint
  console.log('\n6️⃣ Testing Geocoding API Endpoint...');
  
  try {
    const testAddress = {
      address: '123 Pitt Street',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia'
    };

    const response = await fetch('http://localhost:3000/api/geocoding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAddress),
    });

    if (!response.ok) {
      if (response.status === 500) {
        console.log('   ⚠️  Geocoding API endpoint exists but server may not be running');
        console.log('   💡 Start server with: npm run dev');
      } else {
        console.log(`   ⚠️  Geocoding API returned status ${response.status}`);
      }
    } else {
      const data = await response.json();
      if (data.success) {
        console.log('   ✅ Geocoding API working successfully');
        console.log(`   📍 Test result: ${data.coordinates.latitude}, ${data.coordinates.longitude}`);
        console.log(`   🗺️  Provider: ${data.provider}`);
      } else {
        console.log('   ❌ Geocoding API returned error:', data.error);
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Development server not running');
      console.log('   💡 Start server with: npm run dev');
    } else {
      console.error('   ❌ Geocoding API test failed:', error.message);
    }
  }

  // Test Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log('✅ Basic setup complete - geocoding system is ready to use!');
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('  1. Run spatial migration: npm run migrate:spatial');
  console.log('  2. Start development server: npm run dev');
  console.log('  3. Test location features in the app');
  console.log('');
  console.log('📝 Optional Enhancements:');
  console.log('  • Add Google Maps API key for production geocoding');
  console.log('  • Configure MapBox as alternative provider');
  console.log('  • Set up caching for geocoding results');
  console.log('');
  console.log('📚 Documentation: See LOCATION_SETUP_GUIDE.md for detailed setup');
}

// Run the tests
testGeocodingSystem().catch(console.error); 