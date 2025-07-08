-- Manual setup for messaging tables
-- Copy and paste this into your Supabase SQL Editor

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY IF NOT EXISTS "Users can view their own conversations" ON conversations
  FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY IF NOT EXISTS "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

CREATE POLICY IF NOT EXISTS "Users can update their own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = ANY(participants));

-- Create policies for messages
CREATE POLICY IF NOT EXISTS "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY IF NOT EXISTS "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS(
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update their own messages" ON messages
  FOR UPDATE USING (
    auth.uid() = sender_id AND
    EXISTS(
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND auth.uid() = ANY(participants)
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON conversations TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated;

-- Verify tables were created
SELECT 'conversations' as table_name, count(*) as row_count FROM conversations
UNION ALL
SELECT 'messages' as table_name, count(*) as row_count FROM messages; 