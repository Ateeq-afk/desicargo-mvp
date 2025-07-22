-- Add superadmin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Create superadmin activity log
CREATE TABLE IF NOT EXISTS superadmin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create platform statistics table
CREATE TABLE IF NOT EXISTS platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_tenants INTEGER DEFAULT 0,
  active_tenants INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_superadmin_logs_user_id ON superadmin_logs(user_id);
CREATE INDEX idx_superadmin_logs_tenant_id ON superadmin_logs(tenant_id);
CREATE INDEX idx_superadmin_logs_created_at ON superadmin_logs(created_at);
CREATE INDEX idx_platform_stats_date ON platform_stats(date);

-- Update existing admin user to be superadmin (for development)
UPDATE users 
SET is_superadmin = true 
WHERE username = 'admin' AND role = 'admin'
LIMIT 1;

-- Insert a default superadmin if none exists
INSERT INTO users (
  username, 
  password_hash, 
  full_name, 
  role, 
  is_superadmin,
  branch_id,
  tenant_id
)
SELECT 
  'superadmin',
  '$2b$10$RVQj1cNJoeiKCwTJHeyAGO5v5vJz1o6Jdpdb0zL9sB3xnGGQxzAKe', -- password: superadmin123
  'Platform Administrator',
  'admin',
  true,
  (SELECT id FROM branches WHERE is_head_office = true LIMIT 1),
  (SELECT id FROM tenants WHERE code = 'default' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE is_superadmin = true
);