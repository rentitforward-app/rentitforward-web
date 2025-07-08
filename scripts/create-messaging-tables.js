const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function createMessagingTables() {
  try {
    console.log('🚀 Creating messaging tables...');

    // Step 1: Create conversations table
    console.log('Creating conversations table...');
    const { error: convError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          listing_id UUID NOT NULL,
          booking_id UUID,
          participants UUID[] NOT NULL,
          last_message TEXT,
          last_message_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (convError && !convError.message.includes('already exists')) {
      console.error('Error creating conversations table:', convError);
    } else {
      console.log('✅ Conversations table ready');
    }

    // Step 2: Create messages table
    console.log('Creating messages table...');
    const { error: msgError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL,
          sender_id UUID NOT NULL,
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (msgError && !msgError.message.includes('already exists')) {
      console.error('Error creating messages table:', msgError);
    } else {
      console.log('✅ Messages table ready');
    }

    // Step 3: Test table access
    console.log('\n🧪 Testing table access...');
    
    const { data: convTest, error: convTestError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
      
    if (convTestError) {
      console.error('❌ Conversations table test failed:', convTestError.message);
    } else {
      console.log('✅ Conversations table accessible');
    }

    const { data: msgTest, error: msgTestError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    if (msgTestError) {
      console.error('❌ Messages table test failed:', msgTestError.message);
    } else {
      console.log('✅ Messages table accessible');
    }

    console.log('\n🎉 Messaging tables setup complete!');
    console.log('You can now use the /messages page.');

  } catch (error) {
    console.error('❌ Script error:', error);
    
    console.log('\n📋 MANUAL SETUP INSTRUCTIONS:');
    console.log('If the script fails, you can manually create the tables by:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run this SQL:');
    console.log(`
-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  booking_id UUID,
  participants UUID[] NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table  
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND auth.uid() = ANY(participants)
    )
  );
    `);
  }
}

createMessagingTables(); 