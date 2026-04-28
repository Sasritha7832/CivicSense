
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Issue = require('./models/Issue');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function testIssueFlow() {
  try {
    console.log('--- Starting Issue Flow Test ---');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Setup Users & Categories
    console.log('Step 1: Setting up users and categories...');
    await User.deleteMany({ email: { $in: ['citizen@example.com', 'admin@example.com', 'officer@example.com'] } });
    await Category.deleteMany({});
    await Issue.deleteMany({});

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Password123!', 12);

    const citizen = await User.create({ name: 'Citizen User', email: 'citizen@example.com', passwordHash, isVerified: true, role: 'citizen' });
    const admin = await User.create({ name: 'Admin User', email: 'admin@example.com', passwordHash, isVerified: true, role: 'admin' });
    const officer = await User.create({ name: 'Officer User', email: 'officer@example.com', passwordHash, isVerified: true, role: 'officer' });

    const category = await Category.create({ name: 'Roads', icon: '🛣️', department: 'Public Works', color: '#ef4444', defaultSlaHours: 48 });

    console.log('Users and category created');

    // 2. Login as Citizen
    console.log('Step 2: Logging in as Citizen...');
    const citLogin = await axios.post(`${API_URL}/auth/login`, { email: 'citizen@example.com', password: 'Password123!' });
    const citToken = citLogin.data.accessToken;

    // 3. Create Issue
    console.log('Step 3: Creating issue as Citizen...');
    const issueData = {
      title: 'Huge pothole on Main St',
      description: 'There is a dangerous pothole near the intersection.',
      category: category._id.toString(),
      priority: 'high',
      latitude: 12.9716,
      longitude: 77.5946,
      address: 'Main St, Bangalore',
      ward: 'Ward 10'
    };
    const issueRes = await axios.post(`${API_URL}/issues`, issueData, {
      headers: { Authorization: `Bearer ${citToken}` }
    });
    const issueId = issueRes.data.issue._id;
    console.log(`Issue created: ${issueId}`);

    // 4. Login as Admin
    console.log('Step 4: Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, { email: 'admin@example.com', password: 'Password123!' });
    const adminToken = adminLogin.data.accessToken;

    // 5. Assign Issue to Officer
    console.log('Step 5: Assigning issue to Officer...');
    const assignRes = await axios.post(`${API_URL}/admin/assign`, {
      issueId,
      officerId: officer._id.toString(),
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Assignment response:', assignRes.data.message);

    // 6. Login as Officer
    console.log('Step 6: Logging in as Officer...');
    const offLogin = await axios.post(`${API_URL}/auth/login`, { email: 'officer@example.com', password: 'Password123!' });
    const offToken = offLogin.data.accessToken;

    // 7. Resolve Issue
    console.log('Step 7: Resolving issue as Officer...');
    const resolveRes = await axios.patch(`${API_URL}/issues/${issueId}/status`, {
      status: 'resolved'
    }, {
      headers: { Authorization: `Bearer ${offToken}` }
    });
    console.log('Resolution response:', resolveRes.data.message);
    console.log('New status:', resolveRes.data.issue.status);

    console.log('--- Issue Flow Test Passed! ---');
    process.exit(0);
  } catch (error) {
    console.error('--- Issue Flow Test Failed! ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testIssueFlow();
