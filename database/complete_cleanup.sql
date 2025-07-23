-- Complete cleanup script for demo tenant data
-- This will remove ALL transactional and master data to start fresh

DO $$
DECLARE
    default_tenant_id UUID;
    default_company_id UUID;
BEGIN
    -- Get the default tenant and company IDs
    SELECT id INTO default_tenant_id FROM tenants WHERE code = 'default';
    SELECT id INTO default_company_id FROM companies WHERE tenant_id = default_tenant_id LIMIT 1;
    
    IF default_tenant_id IS NOT NULL AND default_company_id IS NOT NULL THEN
        RAISE NOTICE 'Completely cleaning data for default tenant: % (company: %)', default_tenant_id, default_company_id;
        
        -- Delete all transactional data (order matters due to foreign keys)
        DELETE FROM payment_receipts WHERE customer_id IN (SELECT id FROM customers WHERE company_id = default_company_id);
        DELETE FROM delivery_details WHERE delivery_run_id IN (SELECT id FROM delivery_runs WHERE company_id = default_company_id);
        DELETE FROM delivery_runs WHERE company_id = default_company_id;
        DELETE FROM ogpl_details WHERE ogpl_id IN (SELECT id FROM ogpl WHERE company_id = default_company_id);
        DELETE FROM ogpl WHERE company_id = default_company_id;
        DELETE FROM invoices WHERE company_id = default_company_id;
        DELETE FROM tracking_history WHERE consignment_id IN (SELECT id FROM consignments WHERE company_id = default_company_id);
        DELETE FROM booking_status_history WHERE consignment_id IN (SELECT id FROM consignments WHERE company_id = default_company_id);
        DELETE FROM consignments WHERE company_id = default_company_id;
        DELETE FROM booking_drafts WHERE tenant_id = default_tenant_id;
        
        -- Delete all master data
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
        
        -- Keep core users for demo but clean up unnecessary data
        DELETE FROM onboarding_analytics WHERE tenant_id = default_tenant_id;
        DELETE FROM platform_stats;
        
        RAISE NOTICE 'Complete data cleanup finished successfully';
    ELSE
        RAISE NOTICE 'Default tenant or company not found';
    END IF;
END $$;

-- Verify complete cleanup results
SELECT 'FINAL VERIFICATION - ALL TABLES CLEANED' as status;

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
    'drivers' as table_name, COUNT(*) as remaining_records 
FROM drivers WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'routes' as table_name, COUNT(*) as remaining_records 
FROM routes WHERE company_id IN (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default'))
UNION ALL
SELECT 
    'booking_drafts' as table_name, COUNT(*) as remaining_records 
FROM booking_drafts WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default');

-- Display available branches and users for reference
SELECT 'AVAILABLE BRANCHES:' as info;
SELECT b.name as branch_name, b.city, b.is_active 
FROM branches b 
JOIN companies c ON b.company_id = c.id 
WHERE c.tenant_id = (SELECT id FROM tenants WHERE code = 'default');

SELECT 'AVAILABLE USERS:' as info;
SELECT u.username, u.full_name, u.role, u.is_active, b.name as branch 
FROM users u 
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.tenant_id = (SELECT id FROM tenants WHERE code = 'default');