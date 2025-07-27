-- Add listing approval system to listings table
-- This migration adds the necessary fields for admin approval workflow

-- Add approval status field
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add rejection reason field
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add approved by field (references admin user)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);

-- Add approved timestamp
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_approval_status ON listings(approval_status);
CREATE INDEX IF NOT EXISTS idx_listings_approved_by ON listings(approved_by);
CREATE INDEX IF NOT EXISTS idx_listings_approved_at ON listings(approved_at);

-- Update existing listings to be 'approved' by default (for backwards compatibility)
UPDATE listings 
SET approval_status = 'approved', 
    approved_at = created_at 
WHERE approval_status = 'pending';

-- Add comment for documentation
COMMENT ON COLUMN listings.approval_status IS 'Admin approval status for the listing';
COMMENT ON COLUMN listings.rejection_reason IS 'Reason provided when listing is rejected';
COMMENT ON COLUMN listings.approved_by IS 'Admin user who approved/rejected the listing';
COMMENT ON COLUMN listings.approved_at IS 'Timestamp when listing was approved/rejected';

-- Create function to automatically set approved_at when status changes
CREATE OR REPLACE FUNCTION update_listing_approval_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Set approved_at when approval_status changes to approved or rejected
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    IF NEW.approval_status IN ('approved', 'rejected') THEN
      NEW.approved_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_listing_approval_timestamp ON listings;
CREATE TRIGGER trigger_update_listing_approval_timestamp
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_approval_timestamp();

-- Update RLS policies to handle approval status
-- Only approved listings should be visible to public
DROP POLICY IF EXISTS "Anyone can view available listings" ON listings;
CREATE POLICY "Anyone can view approved available listings" ON listings
    FOR SELECT USING (is_available = true AND approval_status = 'approved');

-- Owners can still view their own listings regardless of approval status
CREATE POLICY "Owners can view their own listings" ON listings
    FOR SELECT USING (auth.uid() = owner_id);

-- Add admin policy for viewing all listings
CREATE POLICY "Admins can view all listings" ON listings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (email LIKE '%@admin.%' OR full_name LIKE '%Admin%')
        )
    ); 