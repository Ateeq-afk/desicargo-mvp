-- Add article-based customer rates
CREATE TABLE IF NOT EXISTS customer_article_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    article_name VARCHAR(100) NOT NULL,
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    rate_per_kg DECIMAL(10,2),
    rate_per_package DECIMAL(10,2),
    min_charge DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_rate_type CHECK (rate_per_kg IS NOT NULL OR rate_per_package IS NOT NULL)
);

-- Add indexes for faster lookups
CREATE INDEX idx_customer_article_rates_lookup ON customer_article_rates(tenant_id, customer_id, article_name, from_city, to_city);
CREATE INDEX idx_customer_article_rates_customer ON customer_article_rates(tenant_id, customer_id);

-- Add RLS policies
ALTER TABLE customer_article_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customer_article_rates
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Add volumetric weight fields to consignments
ALTER TABLE consignments 
ADD COLUMN IF NOT EXISTS length_cm DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS width_cm DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS volumetric_weight DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS charged_weight DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS is_volumetric_applied BOOLEAN DEFAULT false;

-- Add booking validation fields
ALTER TABLE consignments
ADD COLUMN IF NOT EXISTS booking_validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS validation_warnings JSONB,
ADD COLUMN IF NOT EXISTS credit_limit_override_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS credit_limit_override_reason TEXT;

-- Create booking status history table
CREATE TABLE IF NOT EXISTS booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    consignment_id UUID NOT NULL REFERENCES consignments(id),
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    location VARCHAR(255),
    signature_url TEXT
);

-- Add index for status history
CREATE INDEX idx_booking_status_history_consignment ON booking_status_history(tenant_id, consignment_id);

-- Add RLS policy for status history
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON booking_status_history
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Create customer booking preferences table
CREATE TABLE IF NOT EXISTS customer_booking_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    preferred_destinations JSONB DEFAULT '[]',
    preferred_goods_types JSONB DEFAULT '[]',
    default_payment_type VARCHAR(20),
    default_goods_value DECIMAL(10,2),
    auto_insurance BOOLEAN DEFAULT false,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, customer_id)
);

-- Add RLS policy
ALTER TABLE customer_booking_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customer_booking_preferences
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Create booking drafts table for auto-save
CREATE TABLE IF NOT EXISTS booking_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    draft_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Add index for draft cleanup
CREATE INDEX idx_booking_drafts_expires ON booking_drafts(expires_at);

-- Add RLS policy
ALTER TABLE booking_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON booking_drafts
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Add booking analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS booking_analytics AS
SELECT 
    c.tenant_id,
    DATE_TRUNC('hour', c.booking_date) as booking_hour,
    DATE_TRUNC('day', c.booking_date) as booking_day,
    fb.branch_name as from_branch,
    c.to_city,
    COUNT(*) as booking_count,
    SUM(c.total_amount) as total_value,
    AVG(c.total_amount) as avg_value,
    COUNT(DISTINCT c.consignor_id) as unique_customers
FROM consignments c
LEFT JOIN branches fb ON fb.id = c.from_branch_id
WHERE c.status != 'CANCELLED'
GROUP BY c.tenant_id, booking_hour, booking_day, fb.branch_name, c.to_city;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_booking_analytics_tenant_day ON booking_analytics(tenant_id, booking_day);

-- Add function to check duplicate bookings
CREATE OR REPLACE FUNCTION check_duplicate_booking(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_consignee_phone VARCHAR,
    p_to_city VARCHAR,
    p_booking_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) RETURNS TABLE (
    cn_number VARCHAR,
    booking_date TIMESTAMP WITH TIME ZONE,
    consignee_name VARCHAR,
    total_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.cn_number,
        c.booking_date,
        c.consignee_name,
        c.total_amount
    FROM consignments c
    WHERE c.tenant_id = p_tenant_id
        AND c.consignor_id = p_customer_id
        AND c.consignee_phone = p_consignee_phone
        AND c.to_city = p_to_city
        AND c.booking_date > (p_booking_time - INTERVAL '1 hour')
        AND c.status != 'CANCELLED'
    ORDER BY c.booking_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add function to get customer booking history
CREATE OR REPLACE FUNCTION get_customer_booking_history(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
    cn_number VARCHAR,
    booking_date TIMESTAMP WITH TIME ZONE,
    consignee_name VARCHAR,
    consignee_phone VARCHAR,
    to_city VARCHAR,
    goods_desc VARCHAR,
    total_packages INTEGER,
    actual_weight DECIMAL,
    total_amount DECIMAL,
    payment_type VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.cn_number,
        c.booking_date,
        c.consignee_name,
        c.consignee_phone,
        c.to_city,
        c.goods_desc,
        c.total_packages,
        c.actual_weight,
        c.total_amount,
        c.payment_type,
        c.status
    FROM consignments c
    WHERE c.tenant_id = p_tenant_id
        AND c.consignor_id = p_customer_id
    ORDER BY c.booking_date DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update charged_weight automatically
CREATE OR REPLACE FUNCTION calculate_charged_weight() RETURNS TRIGGER AS $$
BEGIN
    -- Calculate volumetric weight if dimensions are provided
    IF NEW.length_cm IS NOT NULL AND NEW.width_cm IS NOT NULL AND NEW.height_cm IS NOT NULL THEN
        -- Standard volumetric divisor for domestic shipments in India is 5000
        NEW.volumetric_weight := (NEW.length_cm * NEW.width_cm * NEW.height_cm) / 5000.0;
        
        -- Set charged weight to the higher of actual or volumetric
        IF NEW.volumetric_weight > NEW.actual_weight THEN
            NEW.charged_weight := NEW.volumetric_weight;
            NEW.is_volumetric_applied := true;
        ELSE
            NEW.charged_weight := NEW.actual_weight;
            NEW.is_volumetric_applied := false;
        END IF;
    ELSE
        NEW.charged_weight := NEW.actual_weight;
        NEW.is_volumetric_applied := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_charged_weight
    BEFORE INSERT OR UPDATE OF actual_weight, length_cm, width_cm, height_cm
    ON consignments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_charged_weight();