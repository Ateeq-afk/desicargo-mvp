-- Cleanup script for demo tenant data
-- This will remove all transactional and master data while preserving tenant structure

-- First, let's identify the default tenant ID
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    -- Get the default tenant ID
    SELECT id INTO default_tenant_id FROM tenants WHERE code = 'default';
    
    IF default_tenant_id IS NOT NULL THEN
        RAISE NOTICE 'Cleaning data for default tenant: %', default_tenant_id;
        
        -- Delete transactional data (order matters due to foreign keys)
        DELETE FROM pod_images WHERE delivery_id IN (SELECT id FROM deliveries WHERE tenant_id = default_tenant_id);
        DELETE FROM deliveries WHERE tenant_id = default_tenant_id;
        DELETE FROM ogpl_consignments WHERE ogpl_id IN (SELECT id FROM ogpl WHERE tenant_id = default_tenant_id);
        DELETE FROM ogpl WHERE tenant_id = default_tenant_id;
        DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = default_tenant_id);
        DELETE FROM invoices WHERE tenant_id = default_tenant_id;
        DELETE FROM consignment_tracking WHERE consignment_id IN (SELECT id FROM consignments WHERE tenant_id = default_tenant_id);
        DELETE FROM consignments WHERE tenant_id = default_tenant_id;
        DELETE FROM expenses WHERE tenant_id = default_tenant_id;
        
        -- Delete master data
        DELETE FROM rates WHERE tenant_id = default_tenant_id;
        DELETE FROM goods WHERE tenant_id = default_tenant_id;
        DELETE FROM vehicles WHERE tenant_id = default_tenant_id;
        DELETE FROM customers WHERE tenant_id = default_tenant_id;
        
        -- Keep branches and users for demo, but we could clean specific test users if needed
        -- DELETE FROM users WHERE tenant_id = default_tenant_id AND username NOT IN ('admin', 'superadmin');
        
        RAISE NOTICE 'Demo data cleanup completed successfully';
    ELSE
        RAISE NOTICE 'Default tenant not found';
    END IF;
END $$;

-- Reset sequences if needed
-- ALTER SEQUENCE consignments_cn_number_seq RESTART WITH 1;

-- Verify cleanup
SELECT 
    'customers' as table_name, COUNT(*) as remaining_records 
FROM customers WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'goods' as table_name, COUNT(*) as remaining_records 
FROM goods WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'vehicles' as table_name, COUNT(*) as remaining_records 
FROM vehicles WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'rates' as table_name, COUNT(*) as remaining_records 
FROM rates WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'consignments' as table_name, COUNT(*) as remaining_records 
FROM consignments WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default')
UNION ALL
SELECT 
    'invoices' as table_name, COUNT(*) as remaining_records 
FROM invoices WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'default');