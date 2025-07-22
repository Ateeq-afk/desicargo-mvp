-- Create tenants table first
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Add tenant_id to existing tables
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE ogpl ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE delivery_runs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_superadmin_logs_user_id ON superadmin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_logs_tenant_id ON superadmin_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_logs_created_at ON superadmin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_stats_date ON platform_stats(date);

-- Create default tenant for existing data
INSERT INTO tenants (code, name, email, phone, subscription_plan)
VALUES ('default', 'Default Company', 'admin@desicargo.in', '1234567890', 'trial')
ON CONFLICT (code) DO NOTHING;

-- Update existing data to use default tenant
UPDATE companies SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE branches SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE consignments SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE customers SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE vehicles SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE invoices SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE ogpl SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;
UPDATE delivery_runs SET tenant_id = (SELECT id FROM tenants WHERE code = 'default') WHERE tenant_id IS NULL;

-- Create superadmin user
INSERT INTO users (
  username, 
  password_hash, 
  full_name, 
  role, 
  is_superadmin,
  branch_id,
  company_id,
  tenant_id,
  created_at
)
SELECT 
  'superadmin',
  '$2b$10$RVQj1cNJoeiKCwTJHeyAGO5v5vJz1o6Jdpdb0zL9sB3xnGGQxzAKe', -- password: superadmin123
  'Platform Administrator',
  'admin',
  true,
  (SELECT id FROM branches LIMIT 1),
  (SELECT id FROM companies LIMIT 1),
  (SELECT id FROM tenants WHERE code = 'default'),
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'superadmin'
);

-- Also make the existing admin user a superadmin for testing
UPDATE users 
SET is_superadmin = true 
WHERE username = 'admin' AND role = 'admin'
AND NOT EXISTS (SELECT 1 FROM users WHERE is_superadmin = true AND username != 'superadmin');