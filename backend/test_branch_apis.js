const axios = require('axios');
const colors = require('colors');

const API_URL = 'http://localhost:5002/api';

// Test users
const testUsers = [
  { 
    username: 'swift_admin', 
    password: 'admin123', 
    tenantCode: 'swift',
    role: 'admin',
    expectedBranch: 'Bangalore Head Office'
  },
  { 
    username: 'swift_mumbai', 
    password: 'operator123', 
    tenantCode: 'swift',
    role: 'operator',
    expectedBranch: 'Mumbai Branch'
  }
];

async function login(username, password, tenantCode) {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password,
      tenantCode
    });
    return response.data.data;
  } catch (error) {
    console.error(`Login failed for ${username}:`, error.response?.data || error.message);
    throw error;
  }
}

async function testUserAPIs(token, userInfo) {
  console.log(`\n${'='.repeat(60)}`.cyan);
  console.log(`Testing User APIs for ${userInfo.role} - ${userInfo.username}`.cyan);
  console.log('='.repeat(60).cyan);

  try {
    // Test GET /users
    console.log('\n📋 Testing GET /api/users');
    const usersResponse = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Found ${usersResponse.data.data.length} users`.green);
    
    if (userInfo.role === 'admin') {
      console.log('   Admin can see users from all branches'.gray);
    } else {
      const branches = [...new Set(usersResponse.data.data.map(u => u.branch_name))];
      console.log(`   Operator can only see users from: ${branches.join(', ')}`.gray);
      
      // Verify branch isolation
      const wrongBranchUsers = usersResponse.data.data.filter(u => u.branch_name !== userInfo.expectedBranch);
      if (wrongBranchUsers.length > 0) {
        console.log(`❌ Branch isolation failed! Found users from other branches`.red);
      }
    }

    // Test GET /users/:id
    if (usersResponse.data.data.length > 0) {
      const testUserId = usersResponse.data.data[0].id;
      console.log(`\n📋 Testing GET /api/users/${testUserId}`);
      
      const userResponse = await axios.get(`${API_URL}/users/${testUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Successfully fetched user: ${userResponse.data.data.full_name}`.green);
    }

    // Test user creation (admin only)
    if (userInfo.role === 'admin') {
      console.log('\n📋 Testing POST /api/users (create user)');
      
      try {
        const newUser = {
          username: `test_user_${Date.now()}`,
          password: 'Test123!',
          full_name: 'Test User',
          email: 'test@example.com',
          phone: '+919876543210',
          role: 'operator',
          branch_id: usersResponse.data.data[0].branch_id
        };

        const createResponse = await axios.post(`${API_URL}/users`, newUser, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Successfully created user: ${createResponse.data.data.username}`.green);

        // Clean up - delete the test user
        await axios.delete(`${API_URL}/users/${createResponse.data.data.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Cleaned up test user'.gray);
      } catch (error) {
        console.log(`❌ Failed to create user: ${error.response?.data?.error || error.message}`.red);
      }
    } else {
      console.log('\n📋 Testing POST /api/users (should fail for non-admin)');
      
      try {
        await axios.post(`${API_URL}/users`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('❌ Security issue: Non-admin was able to create user!'.red);
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Correctly denied access for non-admin'.green);
        } else {
          console.log(`❌ Unexpected error: ${error.response?.data?.error || error.message}`.red);
        }
      }
    }

  } catch (error) {
    console.error('❌ User API test failed:'.red, error.response?.data || error.message);
  }
}

async function testBranchAPIs(token, userInfo) {
  console.log(`\n${'='.repeat(60)}`.cyan);
  console.log(`Testing Branch APIs for ${userInfo.role} - ${userInfo.username}`.cyan);
  console.log('='.repeat(60).cyan);

  try {
    // Test GET /branches
    console.log('\n🏢 Testing GET /api/branches');
    const branchesResponse = await axios.get(`${API_URL}/branches`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Found ${branchesResponse.data.data.length} branches`.green);
    
    if (userInfo.role === 'admin') {
      console.log('   Admin can see all branches'.gray);
      
      // Display branch summary
      branchesResponse.data.data.forEach(branch => {
        console.log(`   - ${branch.name} (${branch.city}) - ${branch.user_count} users`.gray);
      });
    } else {
      const branchNames = branchesResponse.data.data.map(b => b.name);
      console.log(`   Operator can only see: ${branchNames.join(', ')}`.gray);
      
      // Verify only one branch is visible
      if (branchesResponse.data.data.length !== 1) {
        console.log(`❌ Branch isolation failed! Expected 1 branch, found ${branchesResponse.data.data.length}`.red);
      }
    }

    // Test GET /branches/:id
    if (branchesResponse.data.data.length > 0) {
      const testBranchId = branchesResponse.data.data[0].id;
      console.log(`\n🏢 Testing GET /api/branches/${testBranchId}`);
      
      const branchResponse = await axios.get(`${API_URL}/branches/${testBranchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Successfully fetched branch: ${branchResponse.data.data.name}`.green);
      console.log(`   Today's bookings: ${branchResponse.data.data.today_bookings}`.gray);
      console.log(`   Today's revenue: ₹${branchResponse.data.data.today_revenue}`.gray);

      // Test branch stats
      console.log(`\n📊 Testing GET /api/branches/${testBranchId}/stats`);
      
      const statsResponse = await axios.get(`${API_URL}/branches/${testBranchId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Successfully fetched branch statistics:'.green);
      console.log(`   Staff: ${statsResponse.data.data.total_staff} (${statsResponse.data.data.managers} managers, ${statsResponse.data.data.operators} operators)`.gray);
      console.log(`   Pending deliveries: ${statsResponse.data.data.pending_deliveries}`.gray);
      console.log(`   Active OGPL: ${statsResponse.data.data.active_ogpl}`.gray);
    }

    // Test accessing another branch (should fail for non-admin)
    if (userInfo.role !== 'admin') {
      console.log('\n🏢 Testing access to other branch (should fail)');
      
      // Try to access Bangalore branch as Mumbai operator
      const bangaloreBranchId = '33333333-3333-3333-3333-333333333331';
      
      try {
        await axios.get(`${API_URL}/branches/${bangaloreBranchId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('❌ Security issue: Non-admin was able to access other branch!'.red);
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('✅ Correctly denied access to other branch'.green);
        } else {
          console.log(`❌ Unexpected error: ${error.response?.data?.error || error.message}`.red);
        }
      }
    }

    // Test branch creation (admin only)
    if (userInfo.role === 'admin') {
      console.log('\n🏢 Testing POST /api/branches (create branch)');
      
      try {
        const newBranch = {
          branch_code: `TST_${Date.now().toString().slice(-6)}`,
          name: 'Test Branch',
          address: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          phone: '+919876543210',
          email: 'test@branch.com',
          is_head_office: false
        };

        const createResponse = await axios.post(`${API_URL}/branches`, newBranch, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Successfully created branch: ${createResponse.data.data.name}`.green);

        // Clean up - delete the test branch
        await axios.delete(`${API_URL}/branches/${createResponse.data.data.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Cleaned up test branch'.gray);
      } catch (error) {
        console.log(`❌ Failed to create branch: ${error.response?.data?.error || error.message}`.red);
      }
    }

  } catch (error) {
    console.error('❌ Branch API test failed:'.red, error.response?.data || error.message);
  }
}

async function testDashboard(token, userInfo) {
  console.log(`\n${'='.repeat(60)}`.cyan);
  console.log(`Testing Dashboard API for ${userInfo.role} - ${userInfo.username}`.cyan);
  console.log('='.repeat(60).cyan);

  try {
    console.log('\n📊 Testing GET /api/dashboard/stats');
    const statsResponse = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Successfully fetched dashboard stats:'.green);
    console.log(`   Today's bookings: ${statsResponse.data.data.todayBookings}`.gray);
    console.log(`   Active OGPL: ${statsResponse.data.data.activeOGPL}`.gray);
    console.log(`   Pending deliveries: ${statsResponse.data.data.pendingDeliveries}`.gray);
    console.log(`   Today's revenue: ₹${statsResponse.data.data.todayRevenue}`.gray);
    console.log(`   Total customers: ${statsResponse.data.data.totalCustomers}`.gray);
    
  } catch (error) {
    console.error('❌ Dashboard test failed:'.red, error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('\n🚀 Starting Branch Isolation API Tests'.yellow);
  console.log('====================================='.yellow);

  for (const user of testUsers) {
    try {
      // Login
      console.log(`\n🔐 Logging in as ${user.username} (${user.role})...`.yellow);
      const loginData = await login(user.username, user.password, user.tenantCode);
      console.log(`✅ Login successful!`.green);
      console.log(`   User: ${loginData.user.full_name}`.gray);
      console.log(`   Branch: ${loginData.user.branch_name}`.gray);

      // Run tests
      await testUserAPIs(loginData.accessToken, { ...user, ...loginData.user });
      await testBranchAPIs(loginData.accessToken, { ...user, ...loginData.user });
      await testDashboard(loginData.accessToken, { ...user, ...loginData.user });

    } catch (error) {
      console.error(`\n❌ Failed to test ${user.username}:`.red, error.message);
    }
  }

  console.log('\n\n✅ All tests completed!'.green.bold);
  console.log('========================='.green);
}

// Run the tests
runTests().catch(console.error);