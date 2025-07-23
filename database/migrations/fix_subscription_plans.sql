-- Update company subscription plans to match trial_limitations plan_type
UPDATE companies SET subscription_plan = 'professional' WHERE subscription_plan = 'premium';
UPDATE companies SET subscription_plan = 'trial' WHERE subscription_plan IS NULL OR subscription_plan = '';

-- Also ensure all companies have proper trial dates if on trial
UPDATE companies 
SET trial_ends_at = CURRENT_TIMESTAMP + INTERVAL '14 days'
WHERE subscription_plan = 'trial' AND trial_ends_at IS NULL;