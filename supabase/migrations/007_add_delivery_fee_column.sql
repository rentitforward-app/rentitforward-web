-- Add delivery_fee column to bookings table
-- This handles delivery charges that are separate from the base rental price

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

-- Add delivery_fee to payment_breakdowns table as well for comprehensive tracking
ALTER TABLE payment_breakdowns 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

-- Update the payment breakdown calculation to include delivery fees in totals
-- Note: This will be handled in the application logic, but we document the intent here

-- Add index for delivery fee queries
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_fee ON bookings(delivery_fee) WHERE delivery_fee > 0;
