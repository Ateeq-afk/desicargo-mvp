-- Migration: Add Multi-Tenant Support
-- Date: 2025-07-22
-- Description: Adds tenant management tables and updates existing schema for multi-tenancy

-- Create tenants table for tenant management
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    
    -- Subscription Information
    plan_type VARCHAR(50) DEFAULT 'trial',
    trial_ends_at TIMESTAMP,
    max_users INTEGER DEFAULT 5,
    max_branches INTEGER DEFAULT 2,
    max_consignments_per_month INTEGER DEFAULT 1000,
    
    -- Branding & Customization
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#00D9FF',
    secondary_color VARCHAR(7) DEFAULT '#FF6B35',
    
    -- Status & Metadata
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add tenant_id to ALL existing tables for tenant isolation
ALTER TABLE companies ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE branches ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE routes ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE vehicles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE drivers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE consignments ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE ogpl ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE ogpl_details ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE delivery_runs ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE delivery_details ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE invoices ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE tracking_history ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE payment_receipts ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Create tenant-specific sequences table for auto-numbering
CREATE TABLE tenant_sequences (
    tenant_id UUID REFERENCES tenants(id),
    sequence_type VARCHAR(50), -- 'consignment', 'ogpl', 'invoice', 'receipt', 'delivery_run'
    current_value INTEGER DEFAULT 0,
    prefix VARCHAR(10),
    suffix VARCHAR(10) DEFAULT '',
    reset_period VARCHAR(20) DEFAULT 'yearly', -- 'daily', 'monthly', 'yearly', 'never'
    last_reset_date DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (tenant_id, sequence_type)
);

-- Create performance indexes for tenant queries
CREATE INDEX idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_routes_tenant_id ON routes(tenant_id);
CREATE INDEX idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX idx_drivers_tenant_id ON drivers(tenant_id);
CREATE INDEX idx_consignments_tenant_id ON consignments(tenant_id);
CREATE INDEX idx_ogpl_tenant_id ON ogpl(tenant_id);
CREATE INDEX idx_ogpl_details_tenant_id ON ogpl_details(tenant_id);
CREATE INDEX idx_delivery_runs_tenant_id ON delivery_runs(tenant_id);
CREATE INDEX idx_delivery_details_tenant_id ON delivery_details(tenant_id);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_tracking_history_tenant_id ON tracking_history(tenant_id);
CREATE INDEX idx_payment_receipts_tenant_id ON payment_receipts(tenant_id);

-- Composite indexes for better performance on common queries
CREATE INDEX idx_consignments_tenant_status ON consignments(tenant_id, status);
CREATE INDEX idx_consignments_tenant_date ON consignments(tenant_id, booking_date);
CREATE INDEX idx_ogpl_tenant_status ON ogpl(tenant_id, status);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);

-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogpl ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogpl_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY tenant_isolation_companies ON companies
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_branches ON branches
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_routes ON routes
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_vehicles ON vehicles
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_drivers ON drivers
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_consignments ON consignments
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_ogpl ON ogpl
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_ogpl_details ON ogpl_details
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_delivery_runs ON delivery_runs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_delivery_details ON delivery_details
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_tracking_history ON tracking_history
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_payment_receipts ON payment_receipts
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Create function to get tenant from JWT or session
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- This function should be updated to extract tenant_id from JWT token
    -- For now, it returns the value from current_setting
    RETURN current_setting('app.current_tenant')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set current tenant context
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate next sequence number for tenant
CREATE OR REPLACE FUNCTION get_next_sequence_number(
    p_tenant_id UUID,
    p_sequence_type VARCHAR(50)
)
RETURNS TEXT AS $$
DECLARE
    v_current_value INTEGER;
    v_prefix VARCHAR(10);
    v_suffix VARCHAR(10);
    v_reset_period VARCHAR(20);
    v_last_reset_date DATE;
    v_should_reset BOOLEAN := false;
BEGIN
    -- Get current sequence info
    SELECT current_value, prefix, suffix, reset_period, last_reset_date
    INTO v_current_value, v_prefix, v_suffix, v_reset_period, v_last_reset_date
    FROM tenant_sequences
    WHERE tenant_id = p_tenant_id AND sequence_type = p_sequence_type;
    
    -- Check if sequence needs to be reset
    IF v_reset_period = 'daily' AND v_last_reset_date < CURRENT_DATE THEN
        v_should_reset := true;
    ELSIF v_reset_period = 'monthly' AND DATE_TRUNC('month', v_last_reset_date) < DATE_TRUNC('month', CURRENT_DATE) THEN
        v_should_reset := true;
    ELSIF v_reset_period = 'yearly' AND DATE_TRUNC('year', v_last_reset_date) < DATE_TRUNC('year', CURRENT_DATE) THEN
        v_should_reset := true;
    END IF;
    
    -- Reset if needed
    IF v_should_reset THEN
        v_current_value := 0;
        UPDATE tenant_sequences 
        SET last_reset_date = CURRENT_DATE
        WHERE tenant_id = p_tenant_id AND sequence_type = p_sequence_type;
    END IF;
    
    -- Increment and update
    v_current_value := v_current_value + 1;
    
    UPDATE tenant_sequences
    SET current_value = v_current_value
    WHERE tenant_id = p_tenant_id AND sequence_type = p_sequence_type;
    
    -- Return formatted number
    RETURN COALESCE(v_prefix, '') || LPAD(v_current_value::TEXT, 6, '0') || COALESCE(v_suffix, '');
END;
$$ LANGUAGE plpgsql;

-- Add triggers to ensure tenant_id is always set on insert
CREATE OR REPLACE FUNCTION ensure_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := get_current_tenant_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER trigger_companies_tenant_id BEFORE INSERT ON companies FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_branches_tenant_id BEFORE INSERT ON branches FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_users_tenant_id BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_customers_tenant_id BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_routes_tenant_id BEFORE INSERT ON routes FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_vehicles_tenant_id BEFORE INSERT ON vehicles FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_drivers_tenant_id BEFORE INSERT ON drivers FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_consignments_tenant_id BEFORE INSERT ON consignments FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_ogpl_tenant_id BEFORE INSERT ON ogpl FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_ogpl_details_tenant_id BEFORE INSERT ON ogpl_details FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_delivery_runs_tenant_id BEFORE INSERT ON delivery_runs FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_delivery_details_tenant_id BEFORE INSERT ON delivery_details FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_invoices_tenant_id BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_tracking_history_tenant_id BEFORE INSERT ON tracking_history FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();
CREATE TRIGGER trigger_payment_receipts_tenant_id BEFORE INSERT ON payment_receipts FOR EACH ROW EXECUTE FUNCTION ensure_tenant_id();

-- Create view for tenant statistics
CREATE VIEW tenant_stats AS
SELECT 
    t.id,
    t.tenant_code,
    t.company_name,
    t.plan_type,
    t.is_active,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT b.id) as total_branches,
    COUNT(DISTINCT c.id) as total_consignments,
    COUNT(DISTINCT cu.id) as total_customers,
    t.created_at
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN branches b ON b.tenant_id = t.id
LEFT JOIN consignments c ON c.tenant_id = t.id AND c.booking_date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN customers cu ON cu.tenant_id = t.id
GROUP BY t.id, t.tenant_code, t.company_name, t.plan_type, t.is_active, t.created_at;

-- Comment explaining the migration
COMMENT ON TABLE tenants IS 'Multi-tenant support table containing tenant configuration and subscription info';
COMMENT ON COLUMN tenants.tenant_code IS 'Unique identifier for tenant, used in URLs and API calls';
COMMENT ON COLUMN tenants.plan_type IS 'Subscription plan: trial, starter, professional, enterprise';
COMMENT ON TABLE tenant_sequences IS 'Tenant-specific auto-incrementing sequences for various entity types';
COMMENT ON FUNCTION get_next_sequence_number IS 'Generates next sequence number for tenant with automatic reset support';