-- Fix customers table to properly support multi-tenancy
-- This migration ensures customers table has tenant_id and proper RLS policies

-- 1. Add tenant_id column if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- 3. Update existing customers to have tenant_id based on their company
UPDATE customers c
SET tenant_id = comp.tenant_id
FROM companies comp
WHERE c.company_id = comp.id 
AND c.tenant_id IS NULL;

-- 4. Drop existing RLS policies if they exist
DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
DROP POLICY IF EXISTS customers_tenant_isolation ON customers;
DROP POLICY IF EXISTS customers_superadmin ON customers;

-- 5. Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 6. Create new RLS policy for tenant isolation
-- This policy allows users to see/modify only their tenant's customers
CREATE POLICY customers_tenant_isolation ON customers
    FOR ALL 
    USING (
        -- Allow access if the row's tenant_id matches the current session tenant
        tenant_id = current_setting('app.current_tenant', true)::uuid
        OR 
        -- Allow superadmin access
        current_setting('app.is_superadmin', true) = 'true'
    );

-- 7. Create trigger to ensure tenant_id is set on insert
CREATE OR REPLACE FUNCTION ensure_customer_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If tenant_id is not provided, get it from the current session
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := current_setting('app.current_tenant', true)::uuid;
    END IF;
    
    -- If tenant_id is still null, get it from the company
    IF NEW.tenant_id IS NULL AND NEW.company_id IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id 
        FROM companies 
        WHERE id = NEW.company_id;
    END IF;
    
    -- Ensure tenant_id is not null
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'tenant_id cannot be null for customers table';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_customers_tenant_id ON customers;

-- Create new trigger
CREATE TRIGGER trigger_customers_tenant_id 
    BEFORE INSERT ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION ensure_customer_tenant_id();

-- 8. Add check constraint to ensure tenant_id is never null for new rows
-- First, make sure all existing rows have tenant_id
UPDATE customers 
SET tenant_id = (SELECT id FROM tenants WHERE code = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

-- Then add the NOT NULL constraint
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;

-- 9. Create compound index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_company ON customers(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_active ON customers(tenant_id, is_active);

-- 10. Add comment explaining the setup
COMMENT ON COLUMN customers.tenant_id IS 'Tenant ID for multi-tenant isolation. Set automatically from session or company.';