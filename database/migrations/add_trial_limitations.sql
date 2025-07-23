-- Create trial_limitations table
CREATE TABLE IF NOT EXISTS trial_limitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type VARCHAR(50) NOT NULL UNIQUE,
    max_consignments_per_month INT DEFAULT 500,
    max_users INT DEFAULT 5,
    max_branches INT DEFAULT 2,
    max_vehicles INT DEFAULT 3,
    features_allowed JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default trial limitations
INSERT INTO trial_limitations (plan_type, max_consignments_per_month, max_users, max_branches, max_vehicles, features_allowed)
VALUES 
    ('trial', 500, 5, 2, 3, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": false, "reports": true}'),
    ('starter', 1000, 10, 3, 5, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": true, "reports": true}'),
    ('professional', 5000, 25, 10, 20, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": true, "reports": true, "api_access": true}'),
    ('enterprise', -1, -1, -1, -1, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": true, "reports": true, "api_access": true, "custom_features": true}')
ON CONFLICT (plan_type) DO NOTHING;