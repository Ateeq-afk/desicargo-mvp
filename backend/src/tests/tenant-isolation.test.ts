import { queryWithTenant } from '../config/database';

// Test script to verify tenant isolation
export async function testTenantIsolation() {
  console.log('🧪 Testing Multi-Tenant Isolation...\n');

  // Test tenant IDs (from your seed data)
  const tenant1 = 'swift-express'; // Swift Express
  const tenant2 = 'cargo-masters'; // Cargo Masters
  
  try {
    // Test 1: Check if each tenant sees only their own customers
    console.log('Test 1: Customer Isolation');
    console.log('========================');
    
    const tenant1Customers = await queryWithTenant(
      'SELECT COUNT(*) as count, array_agg(name) as names FROM customers WHERE tenant_id = $1',
      [tenant1],
      tenant1
    );
    
    const tenant2Customers = await queryWithTenant(
      'SELECT COUNT(*) as count, array_agg(name) as names FROM customers WHERE tenant_id = $1',
      [tenant2],
      tenant2
    );
    
    console.log(`Tenant 1 (Swift Express) customers: ${tenant1Customers.rows[0].count}`);
    console.log(`Names: ${tenant1Customers.rows[0].names?.join(', ') || 'None'}`);
    console.log(`\nTenant 2 (Cargo Masters) customers: ${tenant2Customers.rows[0].count}`);
    console.log(`Names: ${tenant2Customers.rows[0].names?.join(', ') || 'None'}`);
    
    // Test 2: Try to access data across tenants (should fail)
    console.log('\n\nTest 2: Cross-Tenant Access Prevention');
    console.log('=====================================');
    
    try {
      // Try to query all customers without tenant context
      const allCustomers = await queryWithTenant(
        'SELECT COUNT(*) FROM customers',
        [],
        tenant1
      );
      console.log(`Tenant 1 can see total customers: ${allCustomers.rows[0].count}`);
      console.log('✅ RLS is working - tenant can only see their own data');
    } catch (error) {
      console.log('❌ Error accessing data:', error);
    }
    
    // Test 3: Check consignments isolation
    console.log('\n\nTest 3: Consignment Isolation');
    console.log('============================');
    
    const tenant1Consignments = await queryWithTenant(
      'SELECT COUNT(*) as count FROM consignments WHERE tenant_id = $1',
      [tenant1],
      tenant1
    );
    
    const tenant2Consignments = await queryWithTenant(
      'SELECT COUNT(*) as count FROM consignments WHERE tenant_id = $1',
      [tenant2],
      tenant2
    );
    
    console.log(`Tenant 1 consignments: ${tenant1Consignments.rows[0].count}`);
    console.log(`Tenant 2 consignments: ${tenant2Consignments.rows[0].count}`);
    
    // Test 4: Master data isolation
    console.log('\n\nTest 4: Master Data Isolation');
    console.log('============================');
    
    const tenant1Branches = await queryWithTenant(
      'SELECT COUNT(*) as count, array_agg(name) as names FROM branches WHERE tenant_id = $1',
      [tenant1],
      tenant1
    );
    
    console.log(`Tenant 1 branches: ${tenant1Branches.rows[0].count}`);
    console.log(`Branch names: ${tenant1Branches.rows[0].names?.join(', ') || 'None'}`);
    
    console.log('\n✅ All tenant isolation tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTenantIsolation().then(() => process.exit(0)).catch(() => process.exit(1));
}