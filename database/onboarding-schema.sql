-- Companies table for multi-tenant support
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL, -- 'ftl', 'ltl', 'parcel', 'mixed'
    fleet_size VARCHAR(50), -- '1-5', '6-20', '20+', 'booking_agent'
    services_offered TEXT[], -- Array of services
    subscription_plan VARCHAR(50) DEFAULT 'trial', -- 'trial', 'basic', 'pro', 'enterprise'
    trial_ends_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_steps JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add company_id to existing tables
ALTER TABLE branches ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE ogpl ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE delivery_runs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    otp VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'signup', 'login', 'reset'
    is_verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding analytics table
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trial limitations table
CREATE TABLE IF NOT EXISTS trial_limitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type VARCHAR(50) NOT NULL,
    max_consignments_per_month INTEGER,
    max_users INTEGER,
    max_branches INTEGER,
    features_allowed TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default trial limitations
INSERT INTO trial_limitations (plan_type, max_consignments_per_month, max_users, max_branches, features_allowed)
VALUES 
    ('trial', 100, 2, 1, ARRAY['booking', 'ogpl', 'tracking', 'basic_reports']),
    ('basic', 500, 5, 3, ARRAY['booking', 'ogpl', 'tracking', 'delivery', 'reports', 'billing']),
    ('pro', 2000, 15, 10, ARRAY['booking', 'ogpl', 'tracking', 'delivery', 'reports', 'billing', 'api_access', 'advanced_reports']),
    ('enterprise', NULL, NULL, NULL, ARRAY['all'])
ON CONFLICT DO NOTHING;

-- Sample data templates table
CREATE TABLE IF NOT EXISTS sample_data_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type VARCHAR(50) NOT NULL, -- 'customer', 'route', 'consignment'
    template_name VARCHAR(100) NOT NULL,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data templates
INSERT INTO sample_data_templates (template_type, template_name, template_data) VALUES
    ('route', 'Common Routes', '{
        "routes": [
            {"from": "Mumbai", "to": "Delhi", "distance": 1400, "transit_days": 2, "rate_per_kg": 2.5},
            {"from": "Mumbai", "to": "Bangalore", "distance": 980, "transit_days": 2, "rate_per_kg": 2.0},
            {"from": "Delhi", "to": "Kolkata", "distance": 1500, "transit_days": 3, "rate_per_kg": 2.2},
            {"from": "Chennai", "to": "Hyderabad", "distance": 520, "transit_days": 1, "rate_per_kg": 1.8},
            {"from": "Mumbai", "to": "Pune", "distance": 150, "transit_days": 1, "rate_per_kg": 1.5}
        ]
    }'),
    ('customer', 'Sample Customers', '{
        "customers": [
            {"name": "Cash Customer", "type": "walkin", "phone": "9999999999"},
            {"name": "ABC Traders", "type": "regular", "gstin": "27AAACB1234C1Z5", "credit_limit": 50000},
            {"name": "XYZ Industries", "type": "regular", "gstin": "27AAACX5678X1Z5", "credit_limit": 100000}
        ]
    }'),
    ('consignment', 'Sample Bookings', '{
        "bookings": [
            {"from": "Mumbai", "to": "Delhi", "packages": 5, "weight": 250, "freight": 6250, "payment_type": "credit"},
            {"from": "Mumbai", "to": "Bangalore", "packages": 3, "weight": 150, "freight": 3000, "payment_type": "paid"}
        ]
    }')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_phone ON companies(phone);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_company ON onboarding_analytics(company_id);

-- Add company_id to all relevant functions and views
-- This ensures data isolation between companies