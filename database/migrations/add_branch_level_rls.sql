-- Add Branch-Level Row Level Security (RLS) Policies
-- This migration adds branch isolation on top of existing tenant isolation
-- Date: 2025-07-23

BEGIN;

-- =============================================
-- 1. CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get current branch ID from session
CREATE OR REPLACE FUNCTION current_branch_id() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_branch_id', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role from session
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_user_role', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or superadmin
CREATE OR REPLACE FUNCTION is_admin_user() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. UPDATE BRANCHES TABLE
-- =============================================

-- Add tenant_id to branches if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'branches' AND column_name = 'tenant_id') THEN
        ALTER TABLE branches ADD COLUMN tenant_id UUID;
        
        -- Update existing branches with tenant_id from their company
        UPDATE branches b
        SET tenant_id = c.tenant_id
        FROM companies c
        WHERE b.company_id = c.id;
        
        -- Add foreign key constraint
        ALTER TABLE branches 
        ADD CONSTRAINT branches_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);

-- =============================================
-- 3. BRANCH-LEVEL RLS POLICIES
-- =============================================

-- Drop existing policies to recreate with branch support
DROP POLICY IF EXISTS tenant_isolation_branches ON branches;

-- Branches: Users see all branches in their tenant (needed for dropdowns)
CREATE POLICY tenant_isolation_branches ON branches
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- Users: Branch-level isolation (non-admins see only their branch users)
DROP POLICY IF EXISTS tenant_isolation_users ON users;

CREATE POLICY tenant_branch_isolation_users ON users
    FOR ALL
    USING (
        tenant_id = current_tenant_id() 
        AND (
            is_admin_user() 
            OR branch_id = current_branch_id()
            OR is_superadmin = true
        )
    );

-- Consignments: Users see consignments related to their branch
DROP POLICY IF EXISTS tenant_isolation_consignments ON consignments;

CREATE POLICY tenant_branch_isolation_consignments ON consignments
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            is_admin_user()
            OR from_branch_id = current_branch_id()
            OR to_branch_id = current_branch_id()
            OR current_branch_id = (SELECT branch_id FROM users WHERE id = created_by)
        )
    );

-- OGPL: Users see OGPLs related to their branch
DROP POLICY IF EXISTS tenant_isolation_ogpl ON ogpl;

CREATE POLICY tenant_branch_isolation_ogpl ON ogpl
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND (
            is_admin_user()
            OR from_branch_id = current_branch_id()
            OR to_branch_id = current_branch_id()
        )
    );

-- Delivery Runs: Branch-specific isolation
DROP POLICY IF EXISTS tenant_isolation_delivery_runs ON delivery_runs;

CREATE POLICY tenant_branch_isolation_delivery_runs ON delivery_runs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM branches b
            WHERE b.id = delivery_runs.branch_id
            AND b.tenant_id = current_tenant_id()
        )
        AND (
            is_admin_user()
            OR branch_id = current_branch_id()
        )
    );

-- Tracking History: Users see tracking for consignments they can access
DROP POLICY IF EXISTS tenant_isolation_tracking_history ON tracking_history;

CREATE POLICY tenant_branch_isolation_tracking_history ON tracking_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM consignments c
            WHERE c.id = tracking_history.consignment_id
            AND c.tenant_id = current_tenant_id()
            AND (
                is_admin_user()
                OR c.from_branch_id = current_branch_id()
                OR c.to_branch_id = current_branch_id()
            )
        )
    );

-- =============================================
-- 4. BRANCH-AGNOSTIC TABLES (Tenant-only isolation)
-- =============================================

-- These tables remain with tenant-only isolation as they're shared across branches:
-- - customers (all branches can access all customers in tenant)
-- - rate_master (shared pricing across branches)
-- - vehicles (fleet shared across branches)
-- - drivers (shared resource)

-- =============================================
-- 5. HELPER VIEWS FOR BRANCH STATISTICS
-- =============================================

-- Create a view for branch-specific dashboard stats
CREATE OR REPLACE VIEW branch_dashboard_stats AS
SELECT 
    b.id as branch_id,
    b.name as branch_name,
    b.tenant_id,
    -- Today's bookings from this branch
    COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE) as today_bookings,
    -- Active OGPLs from this branch
    COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('loaded', 'in_transit')) as active_ogpl,
    -- Pending deliveries to this branch
    COUNT(DISTINCT c2.id) FILTER (WHERE c2.status IN ('booked', 'in_transit', 'reached_destination')) as pending_deliveries,
    -- Today's revenue from this branch
    COALESCE(SUM(c.total_amount) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE), 0) as today_revenue
FROM branches b
LEFT JOIN consignments c ON c.from_branch_id = b.id
LEFT JOIN ogpl o ON o.from_branch_id = b.id
LEFT JOIN consignments c2 ON c2.to_branch_id = b.id
WHERE b.tenant_id = current_tenant_id()
    AND (is_admin_user() OR b.id = current_branch_id())
GROUP BY b.id, b.name, b.tenant_id;

-- View is accessible to all users (RLS will handle filtering)

-- =============================================
-- 6. AUDIT LOG FOR BRANCH ACCESS
-- =============================================

-- Create audit table for tracking cross-branch access by admins
CREATE TABLE IF NOT EXISTS branch_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_branch_id UUID REFERENCES branches(id),
    accessed_branch_id UUID REFERENCES branches(id),
    action VARCHAR(50),
    table_name VARCHAR(50),
    record_id UUID,
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID REFERENCES tenants(id)
);

-- Enable RLS on audit table
ALTER TABLE branch_access_audit ENABLE ROW LEVEL SECURITY;

-- Only superadmins and admins can view audit logs
CREATE POLICY branch_audit_access ON branch_access_audit
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND is_admin_user()
    );

-- =============================================
-- 7. FUNCTIONS FOR BRANCH CONTEXT VALIDATION
-- =============================================

-- Function to validate branch access for API operations
CREATE OR REPLACE FUNCTION validate_branch_access(
    target_branch_id UUID,
    operation VARCHAR DEFAULT 'read'
) RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_branch_id UUID;
BEGIN
    user_role := current_user_role();
    user_branch_id := current_branch_id();
    
    -- Superadmins and admins have full access
    IF user_role IN ('superadmin', 'admin') THEN
        -- Log cross-branch access for audit
        IF user_branch_id IS DISTINCT FROM target_branch_id THEN
            INSERT INTO branch_access_audit (
                user_id, user_branch_id, accessed_branch_id, 
                action, tenant_id
            ) VALUES (
                current_setting('app.current_user_id', true)::uuid,
                user_branch_id,
                target_branch_id,
                operation,
                current_tenant_id()
            );
        END IF;
        RETURN true;
    END IF;
    
    -- Other users can only access their own branch
    RETURN target_branch_id = user_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. UPDATE EXISTING DATA
-- =============================================

-- Ensure all consignments have tenant_id from their branches
UPDATE consignments c
SET tenant_id = b.tenant_id
FROM branches b
WHERE c.from_branch_id = b.id
AND c.tenant_id IS NULL;

-- Ensure all OGPLs have tenant_id
UPDATE ogpl o
SET tenant_id = b.tenant_id
FROM branches b
WHERE o.from_branch_id = b.id
AND o.tenant_id IS NULL;

-- =============================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_consignments_from_branch_tenant 
    ON consignments(from_branch_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_consignments_to_branch_tenant 
    ON consignments(to_branch_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_ogpl_from_branch_tenant 
    ON ogpl(from_branch_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_ogpl_to_branch_tenant 
    ON ogpl(to_branch_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_tenant 
    ON users(branch_id, tenant_id);

COMMIT;

-- Display success message
SELECT 'Branch-level RLS policies created successfully!' AS result;