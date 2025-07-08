-- Enhanced Stripe verification fields for profiles table
-- Add missing stripe_customer_id and other verification fields

-- Add Stripe customer ID field for payment processing
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Add enhanced verification status fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Add document verification tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS document_verification_status text DEFAULT 'not_uploaded' CHECK (document_verification_status IN ('not_uploaded', 'pending', 'verified', 'rejected'));

-- Add identity verification tracking  
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS identity_verification_status text DEFAULT 'unverified' CHECK (identity_verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Add verification submission timestamp
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_submitted_at timestamp with time zone;

-- Add verification completion timestamp
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_completed_at timestamp with time zone;

-- Add admin notes for verification reviews
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_admin_notes text;

-- Add verification requirements tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_requirements jsonb DEFAULT '[]';

-- Create index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_account_id);

-- Create verification_documents table for detailed document tracking
CREATE TABLE IF NOT EXISTS verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('identity_document', 'address_document', 'business_document')),
  stripe_file_id_front text,
  stripe_file_id_back text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason text,
  admin_notes text,
  uploaded_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for verification_documents
CREATE INDEX IF NOT EXISTS idx_verification_documents_user_id ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_verification_documents_type ON verification_documents(document_type);

-- Create audit log for verification actions
CREATE TABLE IF NOT EXISTS verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  performed_by uuid REFERENCES profiles(id),
  performed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_user_id ON verification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_performed_at ON verification_audit_log(performed_at);

-- Create function to update verification status automatically
CREATE OR REPLACE FUNCTION update_verification_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  -- Auto-update overall verification status based on component statuses
  IF NEW.identity_verification_status = 'verified' AND NEW.document_verification_status = 'verified' THEN
    NEW.verification_status = 'verified';
    NEW.is_verified = true;
    NEW.verification_completed_at = now();
  ELSIF NEW.identity_verification_status = 'rejected' OR NEW.document_verification_status = 'rejected' THEN
    NEW.verification_status = 'rejected';
    NEW.is_verified = false;
  ELSIF NEW.identity_verification_status = 'pending' OR NEW.document_verification_status = 'pending' THEN
    NEW.verification_status = 'pending';
    NEW.is_verified = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic verification status updates
DROP TRIGGER IF EXISTS trigger_update_verification_status ON profiles;
CREATE TRIGGER trigger_update_verification_status
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_status();

-- Create function to log verification actions
CREATE OR REPLACE FUNCTION log_verification_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Log verification status changes
  IF TG_OP = 'UPDATE' AND (
    OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
    OLD.identity_verification_status IS DISTINCT FROM NEW.identity_verification_status OR
    OLD.document_verification_status IS DISTINCT FROM NEW.document_verification_status
  ) THEN
    INSERT INTO verification_audit_log (user_id, action, details)
    VALUES (
      NEW.id,
      'verification_status_change',
      jsonb_build_object(
        'old_verification_status', OLD.verification_status,
        'new_verification_status', NEW.verification_status,
        'old_identity_status', OLD.identity_verification_status,
        'new_identity_status', NEW.identity_verification_status,
        'old_document_status', OLD.document_verification_status,
        'new_document_status', NEW.document_verification_status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for verification action logging
DROP TRIGGER IF EXISTS trigger_log_verification_action ON profiles;
CREATE TRIGGER trigger_log_verification_action
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_verification_action();

-- Create function to update document status trigger
CREATE OR REPLACE FUNCTION update_document_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Update user's document verification status based on document statuses
  UPDATE profiles 
  SET document_verification_status = CASE
    WHEN EXISTS (
      SELECT 1 FROM verification_documents 
      WHERE user_id = NEW.user_id 
      AND document_type = 'identity_document' 
      AND status = 'verified'
    ) THEN 'verified'
    WHEN EXISTS (
      SELECT 1 FROM verification_documents 
      WHERE user_id = NEW.user_id 
      AND status = 'rejected'
    ) THEN 'rejected'
    WHEN EXISTS (
      SELECT 1 FROM verification_documents 
      WHERE user_id = NEW.user_id 
      AND status = 'pending'
    ) THEN 'pending'
    ELSE 'not_uploaded'
  END
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document status updates
DROP TRIGGER IF EXISTS trigger_update_document_status ON verification_documents;
CREATE TRIGGER trigger_update_document_status
  BEFORE INSERT OR UPDATE ON verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_status();

-- Create RLS policies for verification_documents
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own verification documents" ON verification_documents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own verification documents" ON verification_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents (for resubmission)
CREATE POLICY "Users can update own verification documents" ON verification_documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all documents (add admin role check here)
CREATE POLICY "Admins can view all verification documents" ON verification_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (email LIKE '%@admin.%' OR full_name LIKE '%Admin%')
    )
  );

-- Create RLS policies for verification_audit_log
ALTER TABLE verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own verification audit logs" ON verification_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all verification audit logs" ON verification_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (email LIKE '%@admin.%' OR full_name LIKE '%Admin%')
    )
  );

-- Add helpful comments
COMMENT ON TABLE verification_documents IS 'Tracks uploaded verification documents and their review status';
COMMENT ON TABLE verification_audit_log IS 'Audit trail for all verification-related actions';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN profiles.verification_status IS 'Overall verification status combining all verification types';
COMMENT ON COLUMN profiles.verification_requirements IS 'JSON array of current verification requirements from Stripe'; 