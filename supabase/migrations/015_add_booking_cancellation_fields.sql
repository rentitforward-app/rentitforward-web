-- Add cancellation fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_note TEXT,
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0;

-- Add index for cancelled bookings
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- Add index for cancellation reasons
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_reason ON bookings(cancellation_reason) WHERE cancellation_reason IS NOT NULL;

-- Update the booking_status enum to include more cancellation states if needed
-- (This is already handled in the initial schema, but we can add more specific states if needed)
-- ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_by_renter';
-- ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_by_owner';

-- Add comment to explain the cancellation fields
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when the booking was cancelled';
COMMENT ON COLUMN bookings.cancellation_reason IS 'Reason for cancellation (user_requested, owner_cancelled, item_unavailable, etc.)';
COMMENT ON COLUMN bookings.cancellation_note IS 'Additional notes about the cancellation';
COMMENT ON COLUMN bookings.cancellation_fee IS 'Fee charged for cancellation (50% if less than 24 hours before pickup)';
COMMENT ON COLUMN bookings.refund_amount IS 'Amount to be refunded to the renter after cancellation fee';
