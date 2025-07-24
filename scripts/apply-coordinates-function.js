#!/usr/bin/env node

/**
 * Script to apply the coordinates function migration
 * This adds a function to extract coordinates from PostGIS location field
 * 
 * Usage: node scripts/apply-coordinates-function.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function applyCoordinatesFunction() {
  console.log('🚀 Applying coordinates function migration...');

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
      '../supabase/migrations/20241202000000_add_coordinates_function.sql'
    );
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Loaded migration file...');

    console.log('🔧 Creating coordinates extraction function...');
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
    console.log('✅ After executing the SQL above, the function will be available!');
    console.log('');
    console.log('🔧 Function created:');
    console.log('   • get_listings_with_coordinates() - Get listings with extracted lat/lng');
    console.log('');
    console.log('🎯 This function will:');
    console.log('   • Extract latitude/longitude from PostGIS location field');
    console.log('   • Return consistent field names for frontend');
    console.log('   • Provide owner information in expected format');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
applyCoordinatesFunction(); 