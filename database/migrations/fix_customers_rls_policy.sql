-- Fix RLS policies for customers table

-- First, create the current_tenant_id function if it doesn't exist
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true));
END;
$$ LANGUAGE plpgsql STABLE;

-- Drop existing policies
DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
DROP POLICY IF EXISTS customers_tenant_isolation ON customers;
DROP POLICY IF EXISTS customers_superadmin ON customers;
DROP POLICY IF EXISTS customers_insert_policy ON customers;

-- Enable RLS if not already enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create a simpler, more direct RLS policy
CREATE POLICY customers_tenant_isolation ON customers
    FOR ALL USING (
        tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true))
        OR 
        current_setting('app.is_superadmin', true) = 'true'
    );

-- Add INSERT policy to ensure tenant_id is set correctly
CREATE POLICY customers_insert_policy ON customers
    FOR INSERT WITH CHECK (
        tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true))
        OR 
        current_setting('app.is_superadmin', true) = 'true'
    );

-- Create a trigger to automatically set tenant_id if not provided
CREATE OR REPLACE FUNCTION set_customer_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true));
    END IF;
    
    -- Validate tenant_id matches current context
    IF NEW.tenant_id != (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)) 
       AND current_setting('app.is_superadmin', true) != 'true' THEN
        RAISE EXCEPTION 'Invalid tenant_id';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_customer_tenant_id_trigger ON customers;

-- Create the trigger
CREATE TRIGGER set_customer_tenant_id_trigger
    BEFORE INSERT OR UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_tenant_id();