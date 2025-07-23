-- Create customer_rates table for customer-specific pricing
CREATE TABLE IF NOT EXISTS customer_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    goods_type VARCHAR(100) NOT NULL,
    special_rate DECIMAL(10,2) NOT NULL,
    min_charge DECIMAL(10,2) DEFAULT 0,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate rates
    UNIQUE(tenant_id, customer_id, from_city, to_city, goods_type, effective_from)
);

-- Create indices for performance
CREATE INDEX idx_customer_rates_tenant ON customer_rates(tenant_id);
CREATE INDEX idx_customer_rates_customer ON customer_rates(customer_id);
CREATE INDEX idx_customer_rates_route ON customer_rates(from_city, to_city, goods_type);
CREATE INDEX idx_customer_rates_active ON customer_rates(is_active);
CREATE INDEX idx_customer_rates_effective ON customer_rates(effective_from, effective_to);

-- Add RLS policy for multi-tenant isolation
ALTER TABLE customer_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_rates_tenant_isolation ON customer_rates
    FOR ALL USING (
        tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true))
        OR 
        current_setting('app.is_superadmin', true) = 'true'
    );

-- Add trigger to automatically set tenant_id
CREATE OR REPLACE FUNCTION set_customer_rates_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_rates_tenant_id_trigger
    BEFORE INSERT ON customer_rates
    FOR EACH ROW EXECUTE FUNCTION set_customer_rates_tenant_id();

-- Add update timestamp trigger
CREATE TRIGGER update_customer_rates_timestamp
    BEFORE UPDATE ON customer_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();