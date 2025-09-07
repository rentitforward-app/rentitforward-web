-- Create comprehensive payment breakdown tables for detailed fee tracking
-- Based on PRICING_AND_INCENTIVES.md requirements

-- Create payment breakdown table to store detailed fee calculations
CREATE TABLE payment_breakdowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Base pricing
    base_price_per_day DECIMAL(10,2) NOT NULL,
    total_days INTEGER NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL, -- base_price * days
    
    -- Renter fees (what renter pays)
    renter_service_fee_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15, -- 15%
    renter_service_fee_amount DECIMAL(10,2) NOT NULL,
    insurance_fee DECIMAL(10,2) DEFAULT 0, -- Optional insurance
    security_deposit DECIMAL(10,2) DEFAULT 0, -- Optional deposit
    renter_total_amount DECIMAL(10,2) NOT NULL, -- subtotal + service_fee + insurance + deposit
    
    -- Owner earnings (what owner receives)
    owner_commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.20, -- 20%
    owner_commission_amount DECIMAL(10,2) NOT NULL,
    owner_net_earnings DECIMAL(10,2) NOT NULL, -- subtotal - commission
    
    -- Platform revenue
    platform_total_revenue DECIMAL(10,2) NOT NULL, -- renter_service_fee + owner_commission
    
    -- Points and incentives
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    points_credit_applied DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    currency VARCHAR(3) DEFAULT 'AUD',
    calculation_version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment transactions table for tracking all money movements
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_breakdown_id UUID NOT NULL REFERENCES payment_breakdowns(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- 'renter_payment', 'owner_payout', 'deposit_hold', 'deposit_refund', 'platform_fee'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'AUD',
    
    -- Stripe references
    stripe_payment_intent_id TEXT,
    stripe_transfer_id TEXT,
    stripe_charge_id TEXT,
    stripe_refund_id TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
    processed_at TIMESTAMPTZ,
    
    -- Metadata
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user points table for tracking incentive points
CREATE TABLE user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Points tracking
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0, -- total - redeemed
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_redeemed INTEGER DEFAULT 0,
    
    -- Metadata
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create points transactions table for detailed points tracking
CREATE TABLE points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- 'earned_first_rental', 'earned_referral', 'earned_review', 'earned_milestone', 'redeemed_booking'
    points_amount INTEGER NOT NULL, -- positive for earned, negative for redeemed
    description TEXT NOT NULL,
    
    -- Reference data
    reference_id UUID, -- could reference other tables
    reference_type VARCHAR(50), -- 'booking', 'referral', 'review', etc.
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_payment_breakdowns_booking_id ON payment_breakdowns(booking_id);
CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_type ON payment_transactions(transaction_type);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_user_points_user_id ON user_points(user_id);
CREATE INDEX idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX idx_points_transactions_type ON points_transactions(transaction_type);

-- Add updated_at triggers
CREATE TRIGGER update_payment_breakdowns_updated_at 
    BEFORE UPDATE ON payment_breakdowns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_points_updated_at 
    BEFORE UPDATE ON user_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE payment_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Payment breakdowns policies
CREATE POLICY "Users can view payment breakdowns for their bookings" ON payment_breakdowns
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM bookings 
            WHERE id = booking_id 
            AND (auth.uid() = renter_id OR auth.uid() = owner_id)
        )
    );

-- Payment transactions policies  
CREATE POLICY "Users can view payment transactions for their bookings" ON payment_transactions
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM bookings 
            WHERE id = booking_id 
            AND (auth.uid() = renter_id OR auth.uid() = owner_id)
        )
    );

-- User points policies
CREATE POLICY "Users can view their own points" ON user_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points" ON user_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points" ON user_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Points transactions policies
CREATE POLICY "Users can view their own points transactions" ON points_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (for admin dashboard access)
CREATE POLICY "Admins can view all payment data" ON payment_breakdowns
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (email = 'admin@rentitforward.com' OR email = 'rentitforward.app@gmail.com')
        )
    );

CREATE POLICY "Admins can view all payment transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (email = 'admin@rentitforward.com' OR email = 'rentitforward.app@gmail.com')
        )
    );

CREATE POLICY "Admins can view all user points" ON user_points
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (email = 'admin@rentitforward.com' OR email = 'rentitforward.app@gmail.com')
        )
    );

CREATE POLICY "Admins can view all points transactions" ON points_transactions
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (email = 'admin@rentitforward.com' OR email = 'rentitforward.app@gmail.com')
        )
    );

