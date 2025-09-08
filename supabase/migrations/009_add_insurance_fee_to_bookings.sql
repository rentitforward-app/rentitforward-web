-- Add insurance_fee column to bookings table
-- This field was missing but is calculated in payment breakdown

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS insurance_fee DECIMAL(10,2) DEFAULT 0;

-- Add index for insurance fee queries
CREATE INDEX IF NOT EXISTS idx_bookings_insurance_fee ON bookings(insurance_fee) WHERE insurance_fee > 0;

-- Update existing bookings to have insurance_fee = 0 if null
UPDATE bookings 
SET insurance_fee = 0 
WHERE insurance_fee IS NULL;
