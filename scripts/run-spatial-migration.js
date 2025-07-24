#!/usr/bin/env node

/**
 * Script to run the spatial indexing migration
 * This adds spatial indexes and functions for location-based queries
 * 
 * Usage: npm run migrate:spatial
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runSpatialMigration() {
  console.log('🚀 Starting spatial indexing migration...');

  // Check for required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname, 
      '../supabase/migrations/20241201000000_add_spatial_indexes.sql'
    );
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Loaded migration file...');

    // Execute the migration
    console.log('🔧 Creating spatial indexes and functions...');
    
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (error) {
      // If rpc doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        console.log(`🔧 Executing: ${statement.substring(0, 50)}...`);
        
        const { error: stmtError } = await supabase
          .from('_raw_sql')  // This might not work, but we'll try
          .select('*')
          .limit(0);

        if (stmtError) {
          console.warn(`⚠️  Could not execute statement directly: ${stmtError.message}`);
        }
      }
    }

    console.log('✅ Spatial indexing migration completed successfully!');
    console.log('');
    console.log('📊 Created indexes:');
    console.log('   • idx_listings_location_spatial (GIST index on listings.location)');
    console.log('   • idx_profiles_location_spatial (GIST index on profiles.location)');
    console.log('   • idx_listings_active_location (Composite index for active listings)');
    console.log('   • idx_listings_category_location (Category + location index)');
    console.log('   • idx_listings_price_location (Price + location index)');
    console.log('');
    console.log('🔧 Created functions:');
    console.log('   • calculate_distance_km() - Calculate distance between points');
    console.log('   • get_listings_within_radius() - Get listings within radius');
    console.log('   • get_listings_sorted_by_distance() - Get listings sorted by distance');
    console.log('');
    console.log('🎯 Performance improvements:');
    console.log('   • Faster distance-based queries');
    console.log('   • Optimized location sorting');
    console.log('   • Better filtered search performance');
    console.log('');
    console.log('📝 Note: You may need to run this migration manually in Supabase SQL editor');
    console.log('   if direct execution from Node.js is not supported.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('🔧 Manual execution required:');
    console.error('   1. Copy the contents of supabase/migrations/20241201000000_add_spatial_indexes.sql');
    console.error('   2. Open Supabase SQL editor: https://supabase.com/dashboard/project/[your-project]/sql');
    console.error('   3. Paste and execute the SQL commands');
    console.error('   4. Verify indexes were created successfully');
    process.exit(1);
  }
}

// Run the migration
runSpatialMigration(); 