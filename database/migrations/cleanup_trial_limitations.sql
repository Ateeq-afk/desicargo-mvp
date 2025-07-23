-- Clean up duplicate entries in trial_limitations
DELETE FROM trial_limitations 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY plan_type ORDER BY created_at DESC) as rn
        FROM trial_limitations
    ) t WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE trial_limitations 
ADD CONSTRAINT trial_limitations_plan_type_key UNIQUE (plan_type);

-- Update the table with proper data
UPDATE trial_limitations SET
    max_consignments_per_month = 500,
    max_users = 5,
    max_branches = 2,
    max_vehicles = 3,
    features_allowed = '["booking", "tracking", "ogpl", "delivery", "reports"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_type = 'trial';

UPDATE trial_limitations SET
    plan_type = 'starter',
    max_consignments_per_month = 1000,
    max_users = 10,
    max_branches = 3,
    max_vehicles = 5,
    features_allowed = '["booking", "tracking", "ogpl", "delivery", "billing", "reports"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_type = 'basic';

UPDATE trial_limitations SET
    plan_type = 'professional',
    max_consignments_per_month = 5000,
    max_users = 25,
    max_branches = 10,
    max_vehicles = 20,
    features_allowed = '["booking", "tracking", "ogpl", "delivery", "billing", "reports", "api_access"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_type = 'pro';

UPDATE trial_limitations SET
    max_consignments_per_month = -1,
    max_users = -1,
    max_branches = -1,
    max_vehicles = -1,
    features_allowed = '["booking", "tracking", "ogpl", "delivery", "billing", "reports", "api_access", "custom_features"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_type = 'enterprise';