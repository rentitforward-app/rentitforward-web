-- Add notifications_last_viewed_at column to preferences table
-- This will be used to track when a user last viewed their notifications page
-- to calculate unread notification counts

-- First check if the preferences table exists
DO $$
BEGIN
    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'preferences' 
        AND column_name = 'notifications_last_viewed_at'
    ) THEN
        ALTER TABLE preferences 
        ADD COLUMN notifications_last_viewed_at TIMESTAMPTZ DEFAULT NULL;
        
        -- Add comment for documentation
        COMMENT ON COLUMN preferences.notifications_last_viewed_at IS 
        'Timestamp when user last viewed their notifications page - used to calculate unread notification badge count';
        
        -- Create index for performance when querying unread notifications
        CREATE INDEX IF NOT EXISTS idx_preferences_notifications_last_viewed 
        ON preferences(notifications_last_viewed_at);
        
        RAISE NOTICE 'Added notifications_last_viewed_at column to preferences table';
    ELSE
        RAISE NOTICE 'Column notifications_last_viewed_at already exists in preferences table';
    END IF;
    
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Preferences table does not exist - skipping migration';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error adding notifications_last_viewed_at column: %', SQLERRM;
END $$;

-- Update RLS policies if needed (assuming preferences table has RLS enabled)
-- Users should be able to update their own notifications_last_viewed_at timestamp
DO $$
BEGIN
    -- Check if RLS is enabled on preferences table
    IF EXISTS (
        SELECT 1 
        FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'preferences' 
        AND n.nspname = 'public' 
        AND c.relrowsecurity = true
    ) THEN
        -- Create or update policy to allow users to update their own preferences
        DROP POLICY IF EXISTS "Users can update own preferences" ON preferences;
        
        CREATE POLICY "Users can update own preferences" ON preferences
        FOR UPDATE USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Updated RLS policy for preferences table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update RLS policies: %', SQLERRM;
END $$;
