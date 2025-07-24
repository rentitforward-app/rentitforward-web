#!/usr/bin/env node

/**
 * Script to fix the get_listings_sorted_by_distance function
 * This corrects field names to match the actual database schema
 * 
 * Usage: node scripts/fix-listings-function.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function fixListingsFunction() {
  console.log('🔧 Fixing listings function with correct schema fields...');

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
      '../supabase/migrations/20241202000001_fix_listings_function.sql'
    );
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Loaded migration file...');

    console.log('🔧 Fixing listings function...');
    console.log('');
    console.log('📝 Applying SQL manually through Supabase dashboard...');
    console.log('');
    console.log('📋 Copy and paste this SQL into your Supabase SQL editor:');
    console.log('   🔗 https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('');
    console.log('--- SQL TO EXECUTE ---');
    console.log(migrationSQL);
    console.log('--- END SQL ---');
    console.log('');
    console.log('✅ After executing the SQL above, the distance calculations should work!');
    console.log('');
    console.log('🔧 Fixed issues:');
    console.log('   • Corrected field names to match actual schema (state, postcode instead of address, city)');
    console.log('   • Added proper coordinate extraction from PostGIS location field');
    console.log('   • Fixed delivery methods array parsing');
    console.log('');
    console.log('🎯 This will fix:');
    console.log('   • Distance calculations showing "No coordinates" errors');
    console.log('   • Missing distance values when changing location');
    console.log('   • Database function errors due to missing fields');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
fixListingsFunction(); 