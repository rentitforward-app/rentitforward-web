-- Add payment functionality to the database schema

-- First, add the payment_required status to the booking_status enum
ALTER TYPE booking_status ADD VALUE 'payment_required';

-- Add payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');

-- Add payment-related columns to the bookings table
ALTER TABLE bookings 
ADD COLUMN payment_status payment_status DEFAULT 'pending',
ADD COLUMN stripe_session_id TEXT,
ADD COLUMN payment_date TIMESTAMPTZ;

-- Update the listings table to use consistent column names with the code
ALTER TABLE listings 
RENAME COLUMN daily_rate TO price_per_day;

ALTER TABLE listings 
RENAME COLUMN weekly_rate TO price_weekly;

ALTER TABLE listings 
RENAME COLUMN deposit_amount TO deposit;

-- Update the bookings table to use consistent column names with the code
ALTER TABLE bookings 
RENAME COLUMN listing_id TO item_id;

ALTER TABLE bookings 
RENAME COLUMN daily_rate TO price_per_day;

-- Add pickup/delivery related columns that the code expects
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
ADD COLUMN IF NOT EXISTS renter_message TEXT;

-- Remove total_days column since it's computed in the application
ALTER TABLE bookings 
DROP COLUMN IF EXISTS total_days;

-- Create index for payment-related queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session_id ON bookings(stripe_session_id); 