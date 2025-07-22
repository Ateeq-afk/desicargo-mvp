-- Drop existing constraints
ALTER TABLE rate_master DROP CONSTRAINT IF EXISTS rate_master_route_unique;
ALTER TABLE customer_rate_master DROP CONSTRAINT IF EXISTS customer_rate_master_route_unique;

-- Add goods_type column to rate_master
ALTER TABLE rate_master 
ADD COLUMN IF NOT EXISTS goods_type VARCHAR(255) NOT NULL DEFAULT 'General';

-- Add goods_type column to customer_rate_master
ALTER TABLE customer_rate_master 
ADD COLUMN IF NOT EXISTS goods_type VARCHAR(255) NOT NULL DEFAULT 'General';

-- Update rate_history table
ALTER TABLE rate_history
ADD COLUMN IF NOT EXISTS goods_type VARCHAR(255);

-- Add unique constraints including goods_type
ALTER TABLE rate_master 
ADD CONSTRAINT rate_master_unique_route_goods 
UNIQUE(company_id, from_city, to_city, goods_type);

ALTER TABLE customer_rate_master 
ADD CONSTRAINT customer_rate_master_unique_route_goods 
UNIQUE(customer_id, from_city, to_city, goods_type);

-- Update indexes for better performance
DROP INDEX IF EXISTS idx_rate_master_route;
CREATE INDEX idx_rate_master_route_goods ON rate_master(company_id, from_city, to_city, goods_type);

DROP INDEX IF EXISTS idx_customer_rate_route;
CREATE INDEX idx_customer_rate_route_goods ON customer_rate_master(customer_id, from_city, to_city, goods_type);

-- Create view for rate comparison
CREATE OR REPLACE VIEW rate_comparison AS
SELECT 
    rm.from_city,
    rm.to_city,
    rm.goods_type,
    rm.rate_per_kg as standard_rate,
    rm.min_charge as standard_min_charge,
    crm.customer_id,
    c.name as customer_name,
    crm.special_rate as customer_rate,
    crm.min_charge as customer_min_charge,
    (rm.rate_per_kg - crm.special_rate) as saving_per_kg
FROM rate_master rm
LEFT JOIN customer_rate_master crm 
    ON rm.from_city = crm.from_city 
    AND rm.to_city = crm.to_city 
    AND rm.goods_type = crm.goods_type
LEFT JOIN customers c ON crm.customer_id = c.id
WHERE rm.is_active = true;