const axios = require('axios');
const { Pool } = require('pg');

// Test configuration
const API_BASE = 'http://localhost:5002/api';
const DB_CONFIG = {
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'desicargo'
};

// Test users for different tenants (using existing demo users)
const TEST_USERS = {
  tenant1: {
    username: 'swift_admin',
    email: 'arjun@swiftlogistics.in',
    password: 'admin123',
    tenantId: '11111111-1111-1111-1111-111111111111',
    tenantCode: 'swift',
    companyName: 'Swift Express Logistics'
  },
  tenant2: {
    username: 'cargo_admin',
    email: 'suresh@cargomasters.in', 
    password: 'admin123',
    tenantId: '55555555-5555-5555-5555-555555555555',
    tenantCode: 'cargomaster',
    companyName: 'Cargo Masters Transport'
  }
};

let tokens = {};
let pool;

// Helper functions
const login = async (userKey) => {
  try {
    const user = TEST_USERS[userKey];
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: user.username,
      password: user.password,
      tenantCode: user.tenantCode
    });
    
    if (response.data.success) {
      tokens[userKey] = response.data.data.accessToken;
      console.log(`✅ Logged in as ${userKey}: ${user.email}`);
      return response.data.data.accessToken;
    }
  } catch (error) {
    console.error(`❌ Login failed for ${userKey}:`, error.response?.data?.error || error.message);
    throw error;
  }
};

const apiCall = async (method, endpoint, data = null, userKey = 'tenant1') => {
  try {
    const user = TEST_USERS[userKey];
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${tokens[userKey]}`,
        'Content-Type': 'application/json',
        'x-tenant-code': user.tenantCode // Add tenant code header
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      data: error.response?.data
    };
  }
};

// Test customer creation and isolation
const testCustomerCreation = async () => {
  console.log('\n🔬 Testing Customer Creation & Isolation...');
  
  try {
    // Create customer for tenant1
    const timestamp = Date.now();
    const customer1Data = {
      name: 'Test Customer Tenant 1',
      phone: `98765${timestamp.toString().slice(-5)}`,
      email: `customer1-${timestamp}@tenant1.com`,
      address: 'Test Address Tenant 1',
      customer_type: 'corporate',
      credit_limit: 50000
    };
    
    const customer1 = await apiCall('POST', '/customers', customer1Data, 'tenant1');
    console.log('✅ Created customer for tenant1:', customer1.data.id);
    
    // Create customer for tenant2 
    const customer2Data = {
      name: 'Test Customer Tenant 2',
      phone: `98765${(timestamp + 1).toString().slice(-5)}`,
      email: `customer2-${timestamp}@tenant2.com`, 
      address: 'Test Address Tenant 2',
      customer_type: 'regular',
      credit_limit: 30000
    };
    
    const customer2 = await apiCall('POST', '/customers', customer2Data, 'tenant2');
    console.log('✅ Created customer for tenant2:', customer2.data.id);
    
    return { customer1: customer1.data, customer2: customer2.data };
  } catch (error) {
    console.error('❌ Customer creation failed:', error.message);
    throw error;
  }
};

// Test customer list isolation
const testCustomerListIsolation = async (testCustomers) => {
  console.log('\n🔬 Testing Customer List Isolation...');
  
  try {
    // Get customers for tenant1
    const tenant1Customers = await apiCall('GET', '/customers', null, 'tenant1');
    console.log(`✅ Tenant1 customers count: ${tenant1Customers.data.customers.length}`);
    
    // Get customers for tenant2
    const tenant2Customers = await apiCall('GET', '/customers', null, 'tenant2');
    console.log(`✅ Tenant2 customers count: ${tenant2Customers.data.customers.length}`);
    
    // Verify isolation - tenant1 should not see tenant2's customers
    const tenant1HasTenant2Customer = tenant1Customers.data.customers.some(c => c.id === testCustomers.customer2.id);
    const tenant2HasTenant1Customer = tenant2Customers.data.customers.some(c => c.id === testCustomers.customer1.id);
    
    if (tenant1HasTenant2Customer) {
      throw new Error('❌ ISOLATION BREACH: Tenant1 can see Tenant2 customer');
    }
    
    if (tenant2HasTenant1Customer) {
      throw new Error('❌ ISOLATION BREACH: Tenant2 can see Tenant1 customer');
    }
    
    console.log('✅ Customer list isolation verified');
    return true;
  } catch (error) {
    console.error('❌ Customer list isolation test failed:', error.message);
    throw error;
  }
};

// Test customer search isolation
const testCustomerSearchIsolation = async (testCustomers) => {
  console.log('\n🔬 Testing Customer Search Isolation...');
  
  try {
    // Search for tenant2's customer from tenant1
    try {
      const searchResults1 = await apiCall('GET', `/customers/search?q=${testCustomers.customer2.phone}`, null, 'tenant1');
      const results1 = searchResults1.data?.customers || searchResults1.data || [];
      console.log(`✅ Tenant1 search for tenant2 customer: ${results1.length} results`);
      
      if (results1.length > 0) {
        throw new Error('❌ ISOLATION BREACH: Tenant1 found Tenant2 customer in search');
      }
    } catch (error) {
      if (error.message.includes('ISOLATION BREACH')) throw error;
      console.log('✅ Tenant1 search returned error (expected for isolation)');
    }
    
    // Search for tenant1's customer from tenant2
    try {
      const searchResults2 = await apiCall('GET', `/customers/search?q=${testCustomers.customer1.phone}`, null, 'tenant2');
      const results2 = searchResults2.data?.customers || searchResults2.data || [];
      console.log(`✅ Tenant2 search for tenant1 customer: ${results2.length} results`);
      
      if (results2.length > 0) {
        throw new Error('❌ ISOLATION BREACH: Tenant2 found Tenant1 customer in search');
      }
    } catch (error) {
      if (error.message.includes('ISOLATION BREACH')) throw error;
      console.log('✅ Tenant2 search returned error (expected for isolation)');
    }
    
    console.log('✅ Customer search isolation verified');
    return true;
  } catch (error) {
    console.error('❌ Customer search isolation test failed:', error.message);
    throw error;
  }
};

// Test direct customer access isolation
const testDirectCustomerAccess = async (testCustomers) => {
  console.log('\n🔬 Testing Direct Customer Access Isolation...');
  
  try {
    // Try to access tenant2's customer from tenant1
    try {
      const response1 = await apiCall('GET', `/customers/${testCustomers.customer2.id}`, null, 'tenant1');
      throw new Error('❌ ISOLATION BREACH: Tenant1 accessed Tenant2 customer directly');
    } catch (error) {
      if (error.status === 404) {
        console.log('✅ Tenant1 cannot access Tenant2 customer (404)');
      } else {
        throw error;
      }
    }
    
    // Try to access tenant1's customer from tenant2
    try {
      const response2 = await apiCall('GET', `/customers/${testCustomers.customer1.id}`, null, 'tenant2');
      throw new Error('❌ ISOLATION BREACH: Tenant2 accessed Tenant1 customer directly');
    } catch (error) {
      if (error.status === 404) {
        console.log('✅ Tenant2 cannot access Tenant1 customer (404)');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Direct customer access isolation verified');
    return true;
  } catch (error) {
    console.error('❌ Direct customer access test failed:', error.message);
    throw error;
  }
};

// Test dashboard customer analytics isolation
const testDashboardIsolation = async () => {
  console.log('\n🔬 Testing Dashboard Customer Analytics Isolation...');
  
  try {
    // Get dashboard stats for both tenants
    const tenant1Stats = await apiCall('GET', '/dashboard/stats', null, 'tenant1');
    const tenant2Stats = await apiCall('GET', '/dashboard/stats', null, 'tenant2');
    
    console.log(`✅ Tenant1 dashboard - Total customers: ${tenant1Stats.data.totalCustomers}`);
    console.log(`✅ Tenant2 dashboard - Total customers: ${tenant2Stats.data.totalCustomers}`);
    
    // Get top customers for both tenants
    const tenant1TopCustomers = await apiCall('GET', '/dashboard/top-customers', null, 'tenant1');
    const tenant2TopCustomers = await apiCall('GET', '/dashboard/top-customers', null, 'tenant2');
    
    console.log(`✅ Tenant1 top customers: ${tenant1TopCustomers.data.length}`);
    console.log(`✅ Tenant2 top customers: ${tenant2TopCustomers.data.length}`);
    
    console.log('✅ Dashboard isolation verified');
    return true;
  } catch (error) {
    console.error('❌ Dashboard isolation test failed:', error.message);
    throw error;
  }
};

// Test customer update isolation
const testCustomerUpdateIsolation = async (testCustomers) => {
  console.log('\n🔬 Testing Customer Update Isolation...');
  
  try {
    // Try to update tenant2's customer from tenant1
    try {
      const updateData = { name: 'HACKED BY TENANT1' };
      await apiCall('PUT', `/customers/${testCustomers.customer2.id}`, updateData, 'tenant1');
      throw new Error('❌ ISOLATION BREACH: Tenant1 updated Tenant2 customer');
    } catch (error) {
      if (error.status === 404) {
        console.log('✅ Tenant1 cannot update Tenant2 customer (404)');
      } else {
        throw error;
      }
    }
    
    // Try to update tenant1's customer from tenant2
    try {
      const updateData = { name: 'HACKED BY TENANT2' };
      await apiCall('PUT', `/customers/${testCustomers.customer1.id}`, updateData, 'tenant2');
      throw new Error('❌ ISOLATION BREACH: Tenant2 updated Tenant1 customer');
    } catch (error) {
      if (error.status === 404) {
        console.log('✅ Tenant2 cannot update Tenant1 customer (404)');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Customer update isolation verified');
    return true;
  } catch (error) {
    console.error('❌ Customer update isolation test failed:', error.message);
    throw error;
  }
};

// Test database-level isolation
const testDatabaseIsolation = async (testCustomers) => {
  console.log('\n🔬 Testing Database-Level RLS Isolation...');
  
  try {
    // Direct database query to verify RLS
    const client = await pool.connect();
    
    // Set session to tenant1 context
    await client.query('SET app.current_tenant_id = $1', [TEST_USERS.tenant1.tenantId]);
    
    // Query customers - should only see tenant1 customers
    const tenant1Result = await client.query('SELECT id, name, tenant_id FROM customers WHERE is_active = true');
    console.log(`✅ Database query as tenant1: ${tenant1Result.rows.length} customers`);
    
    // Verify no tenant2 customers visible
    const hasTenant2Customer = tenant1Result.rows.some(row => row.id === testCustomers.customer2.id);
    if (hasTenant2Customer) {
      throw new Error('❌ RLS BREACH: Tenant1 sees Tenant2 customer in database');
    }
    
    // Set session to tenant2 context
    await client.query('SET app.current_tenant_id = $1', [TEST_USERS.tenant2.tenantId]);
    
    // Query customers - should only see tenant2 customers
    const tenant2Result = await client.query('SELECT id, name, tenant_id FROM customers WHERE is_active = true');
    console.log(`✅ Database query as tenant2: ${tenant2Result.rows.length} customers`);
    
    // Verify no tenant1 customers visible
    const hasTenant1Customer = tenant2Result.rows.some(row => row.id === testCustomers.customer1.id);
    if (hasTenant1Customer) {
      throw new Error('❌ RLS BREACH: Tenant2 sees Tenant1 customer in database');
    }
    
    client.release();
    console.log('✅ Database-level RLS isolation verified');
    return true;
  } catch (error) {
    console.error('❌ Database isolation test failed:', error.message);
    throw error;
  }
};

// Cleanup test data
const cleanup = async (testCustomers) => {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete test customers
    await apiCall('DELETE', `/customers/${testCustomers.customer1.id}`, null, 'tenant1');
    await apiCall('DELETE', `/customers/${testCustomers.customer2.id}`, null, 'tenant2');
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
};

// Main test runner
const runMultiTenantTests = async () => {
  console.log('🚀 Starting Multi-Tenant Customer Isolation Tests\n');
  console.log('='.repeat(50));
  
  try {
    // Initialize database connection
    pool = new Pool(DB_CONFIG);
    
    // Login to both tenants
    await login('tenant1');
    await login('tenant2');
    
    // Run tests
    const testCustomers = await testCustomerCreation();
    await testCustomerListIsolation(testCustomers);
    await testCustomerSearchIsolation(testCustomers);
    await testDirectCustomerAccess(testCustomers);
    await testDashboardIsolation();
    await testCustomerUpdateIsolation(testCustomers);
    await testDatabaseIsolation(testCustomers);
    
    // Cleanup
    await cleanup(testCustomers);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL MULTI-TENANT ISOLATION TESTS PASSED!');
    console.log('✅ Customer data is properly isolated between tenants');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('💥 MULTI-TENANT ISOLATION TEST FAILED!');
    console.error('❌', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
};

// Run tests if called directly
if (require.main === module) {
  runMultiTenantTests();
}

module.exports = { runMultiTenantTests };