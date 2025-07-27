-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification category preferences
    booking_notifications BOOLEAN DEFAULT true NOT NULL,
    message_notifications BOOLEAN DEFAULT true NOT NULL,
    payment_notifications BOOLEAN DEFAULT true NOT NULL,
    review_notifications BOOLEAN DEFAULT true NOT NULL,
    system_notifications BOOLEAN DEFAULT true NOT NULL,
    marketing_notifications BOOLEAN DEFAULT false NOT NULL,
    
    -- Delivery method preferences
    push_enabled BOOLEAN DEFAULT false NOT NULL,
    email_enabled BOOLEAN DEFAULT true NOT NULL,
    
    -- OneSignal specific data
    onesignal_player_id TEXT,
    onesignal_subscription_id TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure one row per user
    UNIQUE(user_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
ON notification_preferences(user_id);

-- Create index for OneSignal lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_onesignal_player_id 
ON notification_preferences(onesignal_player_id) 
WHERE onesignal_player_id IS NOT NULL;

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification preferences" 
ON notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" 
ON notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" 
ON notification_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Create notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Delivery details
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('push', 'email', 'in_app')),
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
    
    -- OneSignal specific data
    onesignal_notification_id TEXT,
    onesignal_external_id TEXT,
    
    -- Additional data (JSON format for flexibility)
    notification_data JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Metadata
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for notification_logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id 
ON notification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type 
ON notification_logs(notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
ON notification_logs(delivery_status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_onesignal_id 
ON notification_logs(onesignal_notification_id) 
WHERE onesignal_notification_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at 
ON notification_logs(created_at);

-- Enable RLS for notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notification logs" 
ON notification_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admin policies (for system to insert/update logs)
CREATE POLICY "Service role can manage notification logs" 
ON notification_logs 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to get user notification preferences with defaults
CREATE OR REPLACE FUNCTION get_user_notification_preferences(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    preferences JSONB;
BEGIN
    SELECT to_jsonb(np.*) INTO preferences
    FROM notification_preferences np
    WHERE np.user_id = target_user_id;
    
    -- Return default preferences if none exist
    IF preferences IS NULL THEN
        preferences := jsonb_build_object(
            'booking_notifications', true,
            'message_notifications', true,
            'payment_notifications', true,
            'review_notifications', true,
            'system_notifications', true,
            'marketing_notifications', false,
            'push_enabled', false,
            'email_enabled', true
        );
    END IF;
    
    RETURN preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user should receive a specific notification type
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
            method_enabled := (preferences->>'push_enabled')::BOOLEAN;
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

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON notification_preferences TO authenticated;
GRANT SELECT ON notification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT, TEXT) TO authenticated; 