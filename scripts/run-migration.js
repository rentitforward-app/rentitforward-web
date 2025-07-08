const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running messaging tables migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/003_add_messaging_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('Tables created: conversations, messages');
    
    // Test if tables now exist
    console.log('\nTesting table access...');
    
    const { data: convTest, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
      
    const { data: msgTest, error: msgError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    if (convError) {
      console.error('Conversations table test failed:', convError);
    } else {
      console.log('✅ Conversations table accessible');
    }

    if (msgError) {
      console.error('Messages table test failed:', msgError);
    } else {
      console.log('✅ Messages table accessible');
    }

  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

runMigration(); 