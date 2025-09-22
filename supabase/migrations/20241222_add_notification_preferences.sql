-- Add notification_preferences column to profiles table
ALTER TABLE public.profiles
ADD COLUMN notification_preferences jsonb DEFAULT '{
  "email_bookings": true,
  "email_messages": true,
  "email_marketing": false,
  "push_notifications": true,
  "push_bookings": true,
  "push_messages": true,
  "push_reminders": true
}'::jsonb;

-- Add comment to the column
COMMENT ON COLUMN public.profiles.notification_preferences IS 'User notification preferences stored as JSON';

-- Create an index for better query performance
CREATE INDEX idx_profiles_notification_preferences ON public.profiles USING gin (notification_preferences);

