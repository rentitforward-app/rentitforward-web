-- Add pickup and return tracking fields to bookings table
-- This enables tracking when items are picked up and returned

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pickup_confirmed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS return_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS return_confirmed_by UUID REFERENCES profiles(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_confirmed_at ON bookings(pickup_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_bookings_return_confirmed_at ON bookings(return_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_confirmed_by ON bookings(pickup_confirmed_by);
CREATE INDEX IF NOT EXISTS idx_bookings_return_confirmed_by ON bookings(return_confirmed_by);

-- Add comments for documentation
COMMENT ON COLUMN bookings.pickup_confirmed_at IS 'Timestamp when pickup was confirmed';
COMMENT ON COLUMN bookings.pickup_confirmed_by IS 'User who confirmed the pickup (renter or owner)';
COMMENT ON COLUMN bookings.return_confirmed_at IS 'Timestamp when return was confirmed';
COMMENT ON COLUMN bookings.return_confirmed_by IS 'User who confirmed the return (renter or owner)';
