-- Add payment functionality to the database schema

-- First, add the payment_required status to the booking_status enum (if not exists)
DO $$ BEGIN
    ALTER TYPE booking_status ADD VALUE 'payment_required';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add payment status enum (if not exists)
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add payment-related columns to the bookings table (if not exists)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Note: The actual database schema already has the correct field names:
-- LISTINGS table uses: price_per_day, price_weekly, deposit, location (geography), condition
-- BOOKINGS table uses: listing_id, price_per_day, deposit_amount

-- The previous migration incorrectly suggested renaming fields that don't need renaming
-- The database already has the correct schema that matches the application code

-- Create indexes for payment-related queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session_id ON bookings(stripe_session_id); 