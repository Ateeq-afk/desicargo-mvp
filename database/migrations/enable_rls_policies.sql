-- Enable Row-Level Security (RLS) for Multi-Tenant Isolation
-- Date: 2025-07-22
-- Description: Implement tenant-level data isolation using RLS

BEGIN;

-- Enable RLS on all tenant-specific tables
-- Note: We'll enable RLS but create permissive policies to maintain current functionality
-- while adding tenant isolation

-- ==============================================
-- ENABLE RLS ON CORE TABLES
-- ==============================================

-- Companies (already has tenant_id)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Users (already has tenant_id) 
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Consignments 
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;

-- OGPL
ALTER TABLE ogpl ENABLE ROW LEVEL SECURITY;

-- Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Drivers
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Delivery Runs
ALTER TABLE delivery_runs ENABLE ROW LEVEL SECURITY;

-- Payment Receipts
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Rate Master
ALTER TABLE rate_master ENABLE ROW LEVEL SECURITY;

-- Customer Rate Master
ALTER TABLE customer_rate_master ENABLE ROW LEVEL SECURITY;

-- Goods Master
ALTER TABLE goods_master ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- CREATE TENANT ISOLATION POLICIES
-- ==============================================

-- Helper function to get current tenant ID from session
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('app.current_tenant', true)::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE SQL STABLE;

-- Companies: Allow access if tenant_id matches current session or user is superadmin
CREATE POLICY tenant_isolation_companies ON companies
  FOR ALL USING (
    tenant_id = current_tenant_id() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (current_setting('app.current_user_id', true))::uuid 
      AND users.is_superadmin = true
    )
  );

-- Users: Allow access if tenant_id matches current session or user is superadmin
CREATE POLICY tenant_isolation_users ON users  
  FOR ALL USING (
    tenant_id = current_tenant_id() OR
    is_superadmin = true OR
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = (current_setting('app.current_user_id', true))::uuid 
      AND u2.is_superadmin = true
    )
  );

-- Branches: Tenant isolation via company
CREATE POLICY tenant_isolation_branches ON branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = branches.company_id 
      AND (c.tenant_id = current_tenant_id() OR 
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Customers: Tenant isolation via company  
CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = customers.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Consignments: Tenant isolation via company
CREATE POLICY tenant_isolation_consignments ON consignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = consignments.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- OGPL: Tenant isolation via company
CREATE POLICY tenant_isolation_ogpl ON ogpl
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = ogpl.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Invoices: Tenant isolation via company
CREATE POLICY tenant_isolation_invoices ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = invoices.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Routes: Tenant isolation via company
CREATE POLICY tenant_isolation_routes ON routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = routes.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Vehicles: Tenant isolation via company
CREATE POLICY tenant_isolation_vehicles ON vehicles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = vehicles.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Drivers: Tenant isolation via company
CREATE POLICY tenant_isolation_drivers ON drivers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = drivers.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Delivery Runs: Tenant isolation via company
CREATE POLICY tenant_isolation_delivery_runs ON delivery_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = delivery_runs.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Payment Receipts: Tenant isolation via company  
CREATE POLICY tenant_isolation_payment_receipts ON payment_receipts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = payment_receipts.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Rate Master: Tenant isolation via company
CREATE POLICY tenant_isolation_rate_master ON rate_master
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = rate_master.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Customer Rate Master: Tenant isolation via company
CREATE POLICY tenant_isolation_customer_rate_master ON customer_rate_master
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = customer_rate_master.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

-- Goods Master: Tenant isolation via company
CREATE POLICY tenant_isolation_goods_master ON goods_master
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = goods_master.company_id 
      AND (c.tenant_id = current_tenant_id() OR
           EXISTS (SELECT 1 FROM users WHERE users.id = (current_setting('app.current_user_id', true))::uuid AND users.is_superadmin = true))
    )
  );

COMMIT;

-- Display success message
SELECT 'Row-Level Security policies enabled successfully!' AS result,
       'All tables now enforce tenant isolation' AS security_status,
       'SuperAdmin users can access all tenant data' AS superadmin_access;