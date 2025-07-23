-- Final cleanup script for demo tenant data
-- This will remove all transactional and master data while preserving tenant structure

DO $$
DECLARE
    default_tenant_id UUID;
    default_company_id UUID;
BEGIN
    -- Get the default tenant and company IDs
    SELECT id INTO default_tenant_id FROM tenants WHERE code = 'default';
    SELECT id INTO default_company_id FROM companies WHERE tenant_id = default_tenant_id LIMIT 1;
    
    IF default_tenant_id IS NOT NULL AND default_company_id IS NOT NULL THEN
        RAISE NOTICE 'Cleaning data for default tenant: % (company: %)', default_tenant_id, default_company_id;
        
        -- Delete transactional data (order matters due to foreign keys)
        DELETE FROM payment_receipts WHERE company_id = default_company_id;
        DELETE FROM delivery_details WHERE delivery_run_id IN (SELECT id FROM delivery_runs WHERE company_id = default_company_id);
        DELETE FROM delivery_runs WHERE company_id = default_company_id;
        DELETE FROM ogpl_details WHERE ogpl_id IN (SELECT id FROM ogpl WHERE company_id = default_company_id);
        DELETE FROM ogpl WHERE company_id = default_company_id;
        DELETE FROM invoices WHERE company_id = default_company_id;
        DELETE FROM tracking_history WHERE consignment_id IN (SELECT id FROM consignments WHERE company_id = default_company_id);
        DELETE FROM booking_status_history WHERE consignment_id IN (SELECT id FROM consignments WHERE company_id = default_company_id);
        DELETE FROM consignments WHERE company_id = default_company_id;
        DELETE FROM booking_drafts WHERE company_id = default_company_id;
        
        -- Delete master data
        DELETE FROM customer_article_rates WHERE customer_id IN (SELECT id FROM customers WHERE company_id = default_company_id);
        DELETE FROM customer_booking_preferences WHERE customer_id IN (SELECT id FROM customers WHERE company_id = default_company_id);
        DELETE FROM customer_rate_master WHERE company_id = default_company_id;
        DELETE FROM rate_approvals WHERE rate_id IN (SELECT id FROM rate_master WHERE company_id = default_company_id);
        DELETE FROM rate_history WHERE rate_id IN (SELECT id FROM rate_master WHERE company_id = default_company_id);
        DELETE FROM rate_master WHERE company_id = default_company_id;
        DELETE FROM goods_master WHERE company_id = default_company_id;
        DELETE FROM drivers WHERE company_id = default_company_id;
        DELETE FROM vehicles WHERE company_id = default_company_id;
        DELETE FROM customers WHERE company_id = default_company_id;
        DELETE FROM routes WHERE company_id = default_company_id;
        
        -- Keep core users for demo, clean up any test users
        DELETE FROM users WHERE tenant_id = default_tenant_id AND username NOT IN ('admin', 'superadmin', 'delhi_mgr', 'blr_manager', 'blr_operator');
        
        RAISE NOTICE 'Demo data cleanup completed successfully';
    ELSE
        RAISE NOTICE 'Default tenant or company not found';
    END IF;
END $$;

-- Reset any sequences to start fresh
SELECT setval('consignments_cn_number_seq', 1, false);

-- Verify cleanup results
SELECT 
    'customers' as table_name, COUNT(*) as remaining_records 
FROM customers WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'goods_master' as table_name, COUNT(*) as remaining_records 
FROM goods_master WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'vehicles' as table_name, COUNT(*) as remaining_records 
FROM vehicles WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'rate_master' as table_name, COUNT(*) as remaining_records 
FROM rate_master WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'consignments' as table_name, COUNT(*) as remaining_records 
FROM consignments WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'invoices' as table_name, COUNT(*) as remaining_records 
FROM invoices WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'users' as table_name, COUNT(*) as remaining_records 
FROM users WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default');