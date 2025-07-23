-- Add missing columns to trial_limitations table
ALTER TABLE trial_limitations 
ADD COLUMN IF NOT EXISTS max_vehicles INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Change features_allowed to JSONB type if it's TEXT[]
ALTER TABLE trial_limitations 
ALTER COLUMN features_allowed TYPE JSONB 
USING CASE 
    WHEN features_allowed IS NULL THEN '{}'::jsonb
    ELSE array_to_json(features_allowed)::jsonb
END;

-- Add unique constraint on plan_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trial_limitations_plan_type_key') THEN
        ALTER TABLE trial_limitations ADD CONSTRAINT trial_limitations_plan_type_key UNIQUE (plan_type);
    END IF;
END $$;

-- Insert default trial limitations if they don't exist
INSERT INTO trial_limitations (plan_type, max_consignments_per_month, max_users, max_branches, max_vehicles, features_allowed)
VALUES 
    ('trial', 500, 5, 2, 3, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": false, "reports": true}'),
    ('starter', 1000, 10, 3, 5, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": true, "reports": true}'),
    ('professional', 5000, 25, 10, 20, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": true, "reports": true, "api_access": true}'),
    ('enterprise', -1, -1, -1, -1, '{"booking": true, "tracking": true, "ogpl": true, "delivery": true, "billing": true, "reports": true, "api_access": true, "custom_features": true}')
ON CONFLICT (plan_type) 
DO UPDATE SET 
    max_consignments_per_month = EXCLUDED.max_consignments_per_month,
    max_users = EXCLUDED.max_users,
    max_branches = EXCLUDED.max_branches,
    max_vehicles = EXCLUDED.max_vehicles,
    features_allowed = EXCLUDED.features_allowed,
    updated_at = CURRENT_TIMESTAMP;