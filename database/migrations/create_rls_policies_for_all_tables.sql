-- Enable Row Level Security (RLS) on all tables with tenant_id
-- This ensures data isolation between tenants at the database level

-- 1. Enable RLS on expense-related tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on master data tables
ALTER TABLE goods_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_rate_master ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on other tables
ALTER TABLE customer_article_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_trips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
    -- Drop policies for expense_categories
    DROP POLICY IF EXISTS expense_categories_tenant_isolation ON expense_categories;
    DROP POLICY IF EXISTS expense_categories_superadmin ON expense_categories;
    
    -- Drop policies for expenses
    DROP POLICY IF EXISTS expenses_tenant_isolation ON expenses;
    DROP POLICY IF EXISTS expenses_superadmin ON expenses;
    
    -- Drop policies for recurring_expenses
    DROP POLICY IF EXISTS recurring_expenses_tenant_isolation ON recurring_expenses;
    DROP POLICY IF EXISTS recurring_expenses_superadmin ON recurring_expenses;
    
    -- Drop policies for goods_master
    DROP POLICY IF EXISTS goods_master_tenant_isolation ON goods_master;
    DROP POLICY IF EXISTS goods_master_superadmin ON goods_master;
    
    -- Drop policies for rate_master
    DROP POLICY IF EXISTS rate_master_tenant_isolation ON rate_master;
    DROP POLICY IF EXISTS rate_master_superadmin ON rate_master;
    
    -- Drop policies for customer_rate_master
    DROP POLICY IF EXISTS customer_rate_master_tenant_isolation ON customer_rate_master;
    DROP POLICY IF EXISTS customer_rate_master_superadmin ON customer_rate_master;
    
    -- Drop policies for other tables
    DROP POLICY IF EXISTS customer_article_rates_tenant_isolation ON customer_article_rates;
    DROP POLICY IF EXISTS customer_article_rates_superadmin ON customer_article_rates;
    
    DROP POLICY IF EXISTS booking_status_history_tenant_isolation ON booking_status_history;
    DROP POLICY IF EXISTS booking_status_history_superadmin ON booking_status_history;
    
    DROP POLICY IF EXISTS locations_tenant_isolation ON locations;
    DROP POLICY IF EXISTS locations_superadmin ON locations;
    
    DROP POLICY IF EXISTS trip_expenses_tenant_isolation ON trip_expenses;
    DROP POLICY IF EXISTS trip_expenses_superadmin ON trip_expenses;
    
    DROP POLICY IF EXISTS trip_routes_tenant_isolation ON trip_routes;
    DROP POLICY IF EXISTS trip_routes_superadmin ON trip_routes;
    
    DROP POLICY IF EXISTS vehicle_trips_tenant_isolation ON vehicle_trips;
    DROP POLICY IF EXISTS vehicle_trips_superadmin ON vehicle_trips;
END $$;

-- Create RLS policies for expense_categories
CREATE POLICY expense_categories_tenant_isolation ON expense_categories
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY expense_categories_superadmin ON expense_categories
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for expenses
CREATE POLICY expenses_tenant_isolation ON expenses
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY expenses_superadmin ON expenses
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for recurring_expenses
CREATE POLICY recurring_expenses_tenant_isolation ON recurring_expenses
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY recurring_expenses_superadmin ON recurring_expenses
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for goods_master
CREATE POLICY goods_master_tenant_isolation ON goods_master
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY goods_master_superadmin ON goods_master
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for rate_master
CREATE POLICY rate_master_tenant_isolation ON rate_master
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY rate_master_superadmin ON rate_master
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for customer_rate_master
CREATE POLICY customer_rate_master_tenant_isolation ON customer_rate_master
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY customer_rate_master_superadmin ON customer_rate_master
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for customer_article_rates
CREATE POLICY customer_article_rates_tenant_isolation ON customer_article_rates
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY customer_article_rates_superadmin ON customer_article_rates
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for booking_status_history
CREATE POLICY booking_status_history_tenant_isolation ON booking_status_history
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY booking_status_history_superadmin ON booking_status_history
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for locations
CREATE POLICY locations_tenant_isolation ON locations
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY locations_superadmin ON locations
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for trip_expenses
CREATE POLICY trip_expenses_tenant_isolation ON trip_expenses
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY trip_expenses_superadmin ON trip_expenses
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for trip_routes
CREATE POLICY trip_routes_tenant_isolation ON trip_routes
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY trip_routes_superadmin ON trip_routes
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Create RLS policies for vehicle_trips
CREATE POLICY vehicle_trips_tenant_isolation ON vehicle_trips
    FOR ALL USING (tenant_id = (SELECT id FROM tenants WHERE code = current_setting('app.current_tenant', true)));

CREATE POLICY vehicle_trips_superadmin ON vehicle_trips
    FOR ALL USING (current_setting('app.is_superadmin', true) = 'true');

-- Grant necessary permissions
GRANT ALL ON expense_categories TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON recurring_expenses TO authenticated;
GRANT ALL ON goods_master TO authenticated;
GRANT ALL ON rate_master TO authenticated;
GRANT ALL ON customer_rate_master TO authenticated;
GRANT ALL ON customer_article_rates TO authenticated;
GRANT ALL ON booking_status_history TO authenticated;
GRANT ALL ON locations TO authenticated;
GRANT ALL ON trip_expenses TO authenticated;
GRANT ALL ON trip_routes TO authenticated;
GRANT ALL ON vehicle_trips TO authenticated;