-- Migration to replace OneSignal with Firebase Cloud Messaging (FCM)
-- This migration updates existing tables and creates new FCM-specific tables

-- 1. Create FCM subscriptions table (replaces OneSignal player IDs)
CREATE TABLE IF NOT EXISTS fcm_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- FCM token and device info
    fcm_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
    device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android')),
    device_id TEXT,
    app_version TEXT,
    
    -- Subscription status
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_active TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure one active token per device
    UNIQUE(user_id, device_id, platform)
);

-- Create indexes for FCM subscriptions
CREATE INDEX IF NOT EXISTS idx_fcm_subscriptions_user_id 
ON fcm_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_fcm_subscriptions_fcm_token 
ON fcm_subscriptions(fcm_token);

CREATE INDEX IF NOT EXISTS idx_fcm_subscriptions_platform 
ON fcm_subscriptions(platform);

CREATE INDEX IF NOT EXISTS idx_fcm_subscriptions_active 
ON fcm_subscriptions(is_active) 
WHERE is_active = true;

-- Enable RLS for FCM subscriptions
ALTER TABLE fcm_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for FCM subscriptions
CREATE POLICY "Users can view their own FCM subscriptions" 
ON fcm_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own FCM subscriptions" 
ON fcm_subscriptions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all FCM subscriptions" 
ON fcm_subscriptions 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Update notification_preferences table to support FCM
ALTER TABLE notification_preferences 
DROP COLUMN IF EXISTS onesignal_player_id,
DROP COLUMN IF EXISTS onesignal_subscription_id;

-- Add FCM-specific preferences
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS fcm_web_enabled BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS fcm_mobile_enabled BOOLEAN DEFAULT false NOT NULL;

-- Rename push_enabled to maintain backward compatibility
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notification_preferences' 
               AND column_name = 'push_enabled') THEN
        -- Copy data from old column to new column
        UPDATE notification_preferences 
        SET push_notifications = push_enabled 
        WHERE push_notifications IS NULL;
        
        -- Drop old column
        ALTER TABLE notification_preferences DROP COLUMN push_enabled;
    END IF;
END $$;

-- 3. Update notification_logs table to support FCM
ALTER TABLE notification_logs 
DROP COLUMN IF EXISTS onesignal_notification_id,
DROP COLUMN IF EXISTS onesignal_external_id;

-- Add FCM-specific columns
ALTER TABLE notification_logs 
ADD COLUMN IF NOT EXISTS fcm_message_id TEXT,
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('web', 'ios', 'android'));

-- Drop old OneSignal indexes
DROP INDEX IF EXISTS idx_notification_logs_onesignal_id;

-- Create new FCM indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_fcm_message_id 
ON notification_logs(fcm_message_id) 
WHERE fcm_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_fcm_token 
ON notification_logs(fcm_token) 
WHERE fcm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_platform 
ON notification_logs(platform) 
WHERE platform IS NOT NULL;

-- 4. Create app_notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS app_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification content
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    
    -- Status and metadata
    is_read BOOLEAN DEFAULT false NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- Additional data (JSON format for flexibility)
    data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- Create indexes for app_notifications
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id 
ON app_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_app_notifications_type 
ON app_notifications(type);

CREATE INDEX IF NOT EXISTS idx_app_notifications_unread 
ON app_notifications(user_id, is_read) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at 
ON app_notifications(created_at DESC);

-- Enable RLS for app_notifications
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_notifications
CREATE POLICY "Users can view their own app notifications" 
ON app_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own app notifications" 
ON app_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all app notifications" 
ON app_notifications 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Create updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_fcm_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fcm_subscriptions_updated_at
    BEFORE UPDATE ON fcm_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_fcm_subscriptions_updated_at();

-- 6. Update helper functions for FCM
CREATE OR REPLACE FUNCTION get_user_fcm_tokens(target_user_id UUID)
RETURNS TABLE(fcm_token TEXT, platform TEXT, device_type TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT fs.fcm_token, fs.platform, fs.device_type
    FROM fcm_subscriptions fs
    WHERE fs.user_id = target_user_id 
    AND fs.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the notification preferences function to work with FCM
CREATE OR REPLACE FUNCTION get_user_notification_preferences(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    preferences JSONB;
    fcm_tokens JSONB;
BEGIN
    -- Get notification preferences
    SELECT to_jsonb(np.*) INTO preferences
    FROM notification_preferences np
    WHERE np.user_id = target_user_id;
    
    -- Get FCM tokens
    SELECT jsonb_agg(
        jsonb_build_object(
            'token', fs.fcm_token,
            'platform', fs.platform,
            'device_type', fs.device_type,
            'last_active', fs.last_active
        )
    ) INTO fcm_tokens
    FROM fcm_subscriptions fs
    WHERE fs.user_id = target_user_id 
    AND fs.is_active = true;
    
    -- Return default preferences if none exist
    IF preferences IS NULL THEN
        preferences := jsonb_build_object(
            'booking_notifications', true,
            'message_notifications', true,
            'payment_notifications', true,
            'review_notifications', true,
            'system_notifications', true,
            'marketing_notifications', false,
            'push_notifications', false,
            'email_enabled', true,
            'fcm_web_enabled', false,
            'fcm_mobile_enabled', false
        );
    END IF;
    
    -- Add FCM tokens to preferences
    preferences := preferences || jsonb_build_object('fcm_tokens', COALESCE(fcm_tokens, '[]'::jsonb));
    
    RETURN preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update should_send_notification function for FCM
CREATE OR REPLACE FUNCTION should_send_notification(
    target_user_id UUID,
    notification_type TEXT,
    delivery_method TEXT DEFAULT 'push'
)
RETURNS BOOLEAN AS $$
DECLARE
    preferences JSONB;
    type_enabled BOOLEAN := false;
    method_enabled BOOLEAN := false;
BEGIN
    -- Get user preferences
    preferences := get_user_notification_preferences(target_user_id);
    
    -- Check if notification type is enabled
    CASE notification_type
        WHEN 'booking_request', 'booking_confirmed', 'booking_cancelled', 'booking_completed' THEN
            type_enabled := (preferences->>'booking_notifications')::BOOLEAN;
        WHEN 'message_received' THEN
            type_enabled := (preferences->>'message_notifications')::BOOLEAN;
        WHEN 'payment_received', 'payment_failed' THEN
            type_enabled := (preferences->>'payment_notifications')::BOOLEAN;
        WHEN 'review_received', 'review_request' THEN
            type_enabled := (preferences->>'review_notifications')::BOOLEAN;
        WHEN 'system_announcement', 'reminder' THEN
            type_enabled := (preferences->>'system_notifications')::BOOLEAN;
        WHEN 'listing_approved', 'listing_rejected' THEN
            type_enabled := (preferences->>'system_notifications')::BOOLEAN;
        ELSE
            type_enabled := false;
    END CASE;
    
    -- Check if delivery method is enabled
    CASE delivery_method
        WHEN 'push' THEN
            method_enabled := (preferences->>'push_notifications')::BOOLEAN;
        WHEN 'email' THEN
            method_enabled := (preferences->>'email_enabled')::BOOLEAN;
        WHEN 'in_app' THEN
            method_enabled := true; -- In-app notifications are always enabled
        ELSE
            method_enabled := false;
    END CASE;
    
    RETURN type_enabled AND method_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fcm_subscriptions TO authenticated;
GRANT SELECT, UPDATE ON app_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_fcm_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT, TEXT) TO authenticated;

-- 8. Create function to clean up inactive FCM tokens
CREATE OR REPLACE FUNCTION cleanup_inactive_fcm_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens that haven't been active for more than 30 days
    DELETE FROM fcm_subscriptions 
    WHERE last_active < NOW() - INTERVAL '30 days'
    AND is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cleanup function to service role
GRANT EXECUTE ON FUNCTION cleanup_inactive_fcm_tokens() TO service_role;

-- 9. Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM app_notifications
    WHERE user_id = target_user_id 
    AND is_read = false 
    AND is_archived = false;
    
    RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;

-- 10. Add comments for documentation
COMMENT ON TABLE fcm_subscriptions IS 'Stores FCM tokens for push notifications to replace OneSignal player IDs';
COMMENT ON TABLE app_notifications IS 'Stores in-app notifications that appear in the notification center';
COMMENT ON FUNCTION get_user_fcm_tokens(UUID) IS 'Returns all active FCM tokens for a user across all devices';
COMMENT ON FUNCTION cleanup_inactive_fcm_tokens() IS 'Removes FCM tokens that have been inactive for more than 30 days';
COMMENT ON FUNCTION get_unread_notification_count(UUID) IS 'Returns the count of unread notifications for a user';

