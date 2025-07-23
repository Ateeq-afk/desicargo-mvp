-- Migration to add tenant_id to all tables that need multi-tenant isolation
-- This ensures complete data isolation between tenants

-- 1. Add tenant_id to expense-related tables
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE recurring_expenses 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 2. Add tenant_id to master data tables
ALTER TABLE goods_master 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE rate_master 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE customer_rate_master 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Add tenant_id to other tables that might be missing it
ALTER TABLE customer_article_rates 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE booking_status_history 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE trip_expenses 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE trip_routes 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE vehicle_trips 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 4. Update existing data to set tenant_id based on company_id
-- For expense tables
UPDATE expense_categories ec
SET tenant_id = c.tenant_id
FROM companies c
WHERE ec.company_id = c.id AND ec.tenant_id IS NULL;

UPDATE expenses e
SET tenant_id = c.tenant_id
FROM companies c
WHERE e.company_id = c.id AND e.tenant_id IS NULL;

UPDATE recurring_expenses re
SET tenant_id = c.tenant_id
FROM companies c
WHERE re.company_id = c.id AND re.tenant_id IS NULL;

-- For master data tables
UPDATE goods_master gm
SET tenant_id = c.tenant_id
FROM companies c
WHERE gm.company_id = c.id AND gm.tenant_id IS NULL;

UPDATE rate_master rm
SET tenant_id = c.tenant_id
FROM companies c
WHERE rm.company_id = c.id AND rm.tenant_id IS NULL;

UPDATE customer_rate_master crm
SET tenant_id = c.tenant_id
FROM companies c
WHERE crm.company_id = c.id AND crm.tenant_id IS NULL;

-- For other tables
UPDATE customer_article_rates car
SET tenant_id = c.tenant_id
FROM companies c
WHERE car.company_id = c.id AND car.tenant_id IS NULL;

UPDATE booking_status_history bsh
SET tenant_id = c.tenant_id
FROM consignments cn
JOIN companies c ON cn.company_id = c.id
WHERE bsh.consignment_id = cn.id AND bsh.tenant_id IS NULL;

UPDATE locations l
SET tenant_id = c.tenant_id
FROM companies c
WHERE l.company_id = c.id AND l.tenant_id IS NULL;

UPDATE trip_expenses te
SET tenant_id = vt.tenant_id
FROM vehicle_trips vt
WHERE te.trip_id = vt.id AND te.tenant_id IS NULL;

UPDATE trip_routes tr
SET tenant_id = vt.tenant_id
FROM vehicle_trips vt
WHERE tr.trip_id = vt.id AND tr.tenant_id IS NULL;

UPDATE vehicle_trips vt
SET tenant_id = c.tenant_id
FROM vehicles v
JOIN companies c ON v.company_id = c.id
WHERE vt.vehicle_id = v.id AND vt.tenant_id IS NULL;

-- 5. Make tenant_id NOT NULL after populating data
ALTER TABLE expense_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE goods_master ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rate_master ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE customer_rate_master ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant_id ON expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_tenant_id ON recurring_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_goods_master_tenant_id ON goods_master(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_master_tenant_id ON rate_master(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_rate_master_tenant_id ON customer_rate_master(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_article_rates_tenant_id ON customer_article_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_tenant_id ON booking_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_tenant_id ON trip_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trip_routes_tenant_id ON trip_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_tenant_id ON vehicle_trips(tenant_id);