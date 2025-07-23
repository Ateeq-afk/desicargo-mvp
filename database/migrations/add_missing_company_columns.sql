-- Migration: Add missing columns to companies table
-- Date: 2025-07-22
-- Description: Add trial management and onboarding tracking columns

-- Add missing columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}';

-- Update existing companies with reasonable defaults
UPDATE companies 
SET 
  trial_ends_at = COALESCE(trial_ends_at, CURRENT_TIMESTAMP + INTERVAL '30 days'),
  subscription_ends_at = COALESCE(subscription_ends_at, CURRENT_TIMESTAMP + INTERVAL '30 days'),
  onboarding_completed = COALESCE(onboarding_completed, false),
  onboarding_steps = COALESCE(onboarding_steps, '{}')
WHERE trial_ends_at IS NULL OR subscription_ends_at IS NULL OR onboarding_completed IS NULL OR onboarding_steps IS NULL;

-- Add some useful indexes
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends_at ON companies(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_ends_at ON companies(subscription_ends_at);
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_completed ON companies(onboarding_completed);

-- Add comments for clarity
COMMENT ON COLUMN companies.trial_ends_at IS 'When the free trial expires';
COMMENT ON COLUMN companies.subscription_ends_at IS 'When the paid subscription expires';
COMMENT ON COLUMN companies.onboarding_completed IS 'Whether the company has completed initial setup';
COMMENT ON COLUMN companies.onboarding_steps IS 'JSON object tracking completion of onboarding steps';

-- Display completion message
SELECT 'Added missing columns to companies table successfully' AS result;