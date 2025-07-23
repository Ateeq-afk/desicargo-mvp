-- Cleanup script for demo tenant data (corrected table names)
-- This will remove all transactional and master data while preserving tenant structure

DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    -- Get the default tenant ID
    SELECT id INTO default_tenant_id FROM tenants WHERE code = 'default';
    
    IF default_tenant_id IS NOT NULL THEN
        RAISE NOTICE 'Cleaning data for default tenant: %', default_tenant_id;
        
        -- Delete transactional data (order matters due to foreign keys)
        DELETE FROM payment_receipts WHERE tenant_id = default_tenant_id;
        DELETE FROM delivery_details WHERE delivery_run_id IN (SELECT id FROM delivery_runs WHERE tenant_id = default_tenant_id);
        DELETE FROM delivery_runs WHERE tenant_id = default_tenant_id;
        DELETE FROM ogpl_details WHERE ogpl_id IN (SELECT id FROM ogpl WHERE tenant_id = default_tenant_id);
        DELETE FROM ogpl WHERE tenant_id = default_tenant_id;
        DELETE FROM invoices WHERE tenant_id = default_tenant_id;
        DELETE FROM tracking_history WHERE consignment_id IN (SELECT id FROM consignments WHERE tenant_id = default_tenant_id);
        DELETE FROM booking_status_history WHERE consignment_id IN (SELECT id FROM consignments WHERE tenant_id = default_tenant_id);
        DELETE FROM consignments WHERE tenant_id = default_tenant_id;
        DELETE FROM booking_drafts WHERE tenant_id = default_tenant_id;
        
        -- Delete master data
        DELETE FROM customer_article_rates WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = default_tenant_id);
        DELETE FROM customer_booking_preferences WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = default_tenant_id);
        DELETE FROM customer_rate_master WHERE tenant_id = default_tenant_id;
        DELETE FROM rate_approvals WHERE rate_id IN (SELECT id FROM rate_master WHERE tenant_id = default_tenant_id);
        DELETE FROM rate_history WHERE rate_id IN (SELECT id FROM rate_master WHERE tenant_id = default_tenant_id);
        DELETE FROM rate_master WHERE tenant_id = default_tenant_id;
        DELETE FROM goods_master WHERE tenant_id = default_tenant_id;
        DELETE FROM drivers WHERE tenant_id = default_tenant_id;
        DELETE FROM vehicles WHERE tenant_id = default_tenant_id;
        DELETE FROM customers WHERE tenant_id = default_tenant_id;
        DELETE FROM routes WHERE tenant_id = default_tenant_id;
        
        -- Keep branches and core users for demo
        -- Clean up specific test/demo users if any exist
        DELETE FROM users WHERE tenant_id = default_tenant_id AND username NOT IN ('admin', 'superadmin', 'delhi_mgr', 'blr_manager', 'blr_operator');
        
        RAISE NOTICE 'Demo data cleanup completed successfully';
    ELSE
        RAISE NOTICE 'Default tenant not found';
    END IF;
END $$;

-- Verify cleanup results
SELECT 
    'customers' as table_name, COUNT(*) as remaining_records 
FROM customers WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'goods_master' as table_name, COUNT(*) as remaining_records 
FROM goods_master WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'vehicles' as table_name, COUNT(*) as remaining_records 
FROM vehicles WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'rate_master' as table_name, COUNT(*) as remaining_records 
FROM rate_master WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'consignments' as table_name, COUNT(*) as remaining_records 
FROM consignments WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'invoices' as table_name, COUNT(*) as remaining_records 
FROM invoices WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'users' as table_name, COUNT(*) as remaining_records 
FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default');