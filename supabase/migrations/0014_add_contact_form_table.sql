-- Create contact form submissions table
CREATE TABLE IF NOT EXISTS contact_form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for quick lookups
CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_email ON contact_form_submissions(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_status ON contact_form_submissions(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_created_at ON contact_form_submissions(created_at);

-- Enable RLS
ALTER TABLE contact_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Contact form submissions are viewable by authenticated users" ON contact_form_submissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert contact form submissions" ON contact_form_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Contact form submissions can be updated by authenticated users" ON contact_form_submissions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contact_form_submissions_updated_at 
  BEFORE UPDATE ON contact_form_submissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
