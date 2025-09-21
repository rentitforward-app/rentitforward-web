-- Create issue reports table for tracking rental issues
CREATE TYPE issue_type AS ENUM (
    'damage',
    'missing_parts', 
    'malfunction',
    'cleanliness',
    'late_pickup',
    'communication',
    'safety',
    'fraud',
    'other'
);

CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE issue_status AS ENUM ('open', 'investigating', 'resolved', 'closed', 'escalated');
CREATE TYPE contact_preference AS ENUM ('email', 'phone', 'message');

CREATE TABLE issue_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reporter_role TEXT NOT NULL CHECK (reporter_role IN ('owner', 'renter')),
    
    -- Issue details
    issue_type issue_type NOT NULL,
    severity issue_severity NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    occurred_at TIMESTAMPTZ,
    location TEXT,
    
    -- Financial impact
    financial_impact BOOLEAN DEFAULT FALSE,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Resolution
    resolution_requested TEXT,
    resolution_provided TEXT,
    
    -- Media
    photos TEXT[] DEFAULT '{}',
    
    -- Contact and status
    contact_preference contact_preference DEFAULT 'email',
    status issue_status DEFAULT 'open',
    
    -- Admin fields
    assigned_to UUID REFERENCES profiles(id),
    admin_notes TEXT,
    internal_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX idx_issue_reports_booking_id ON issue_reports(booking_id);
CREATE INDEX idx_issue_reports_reporter_id ON issue_reports(reporter_id);
CREATE INDEX idx_issue_reports_status ON issue_reports(status);
CREATE INDEX idx_issue_reports_severity ON issue_reports(severity);
CREATE INDEX idx_issue_reports_created_at ON issue_reports(created_at);

-- Create RLS policies
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports (as reporter)
CREATE POLICY "Users can view their own issue reports" ON issue_reports
    FOR SELECT USING (reporter_id = auth.uid());

-- Users can insert their own reports
CREATE POLICY "Users can create issue reports" ON issue_reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Users can update their own reports (limited fields)
CREATE POLICY "Users can update their own reports" ON issue_reports
    FOR UPDATE USING (reporter_id = auth.uid())
    WITH CHECK (reporter_id = auth.uid());

-- Booking participants can view reports for their bookings
CREATE POLICY "Booking participants can view reports" ON issue_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = issue_reports.booking_id 
            AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
        )
    );

-- Admin users can view all reports (assuming admin role in profiles)
CREATE POLICY "Admins can view all reports" ON issue_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_issue_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_issue_reports_updated_at
    BEFORE UPDATE ON issue_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_issue_reports_updated_at();

-- Create storage bucket for issue photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for issue photos
CREATE POLICY "Users can upload issue photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'issue-photos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view issue photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'issue-photos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete their own issue photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'issue-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create view for issue reports with booking and user details
CREATE VIEW issue_reports_with_details AS
SELECT 
    ir.*,
    b.start_date as booking_start_date,
    b.end_date as booking_end_date,
    b.total_amount as booking_total_amount,
    b.status as booking_status,
    l.title as listing_title,
    l.category as listing_category,
    l.images as listing_images,
    reporter.full_name as reporter_name,
    reporter.email as reporter_email,
    reporter.phone as reporter_phone,
    CASE 
        WHEN ir.reporter_role = 'owner' THEN renter.full_name
        ELSE owner.full_name
    END as other_party_name,
    CASE 
        WHEN ir.reporter_role = 'owner' THEN renter.email
        ELSE owner.email
    END as other_party_email
FROM issue_reports ir
JOIN bookings b ON ir.booking_id = b.id
JOIN listings l ON b.listing_id = l.id
JOIN profiles reporter ON ir.reporter_id = reporter.id
JOIN profiles owner ON l.owner_id = owner.id
JOIN profiles renter ON b.renter_id = renter.id;

-- Grant access to the view
GRANT SELECT ON issue_reports_with_details TO authenticated;

-- Create function to get issue report statistics
CREATE OR REPLACE FUNCTION get_issue_report_stats(
    start_date TIMESTAMPTZ DEFAULT NULL,
    end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_reports BIGINT,
    open_reports BIGINT,
    resolved_reports BIGINT,
    critical_reports BIGINT,
    avg_resolution_time INTERVAL,
    reports_by_type JSONB,
    reports_by_severity JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_reports AS (
        SELECT *
        FROM issue_reports
        WHERE (start_date IS NULL OR created_at >= start_date)
        AND (end_date IS NULL OR created_at <= end_date)
    ),
    resolution_times AS (
        SELECT 
            EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 as hours_to_resolve
        FROM filtered_reports
        WHERE resolved_at IS NOT NULL
    )
    SELECT 
        COUNT(*)::BIGINT as total_reports,
        COUNT(*) FILTER (WHERE status IN ('open', 'investigating'))::BIGINT as open_reports,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::BIGINT as resolved_reports,
        COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT as critical_reports,
        CASE 
            WHEN COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) > 0 
            THEN MAKE_INTERVAL(hours => AVG(rt.hours_to_resolve)::INTEGER)
            ELSE NULL
        END as avg_resolution_time,
        jsonb_object_agg(
            issue_type, 
            COUNT(*) FILTER (WHERE issue_type = fr.issue_type)
        ) as reports_by_type,
        jsonb_object_agg(
            severity, 
            COUNT(*) FILTER (WHERE severity = fr.severity)
        ) as reports_by_severity
    FROM filtered_reports fr
    LEFT JOIN resolution_times rt ON true
    GROUP BY ();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_issue_report_stats TO authenticated;
