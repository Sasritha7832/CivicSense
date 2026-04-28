const { io } = require('socket.io-client');
const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function testSocketNotifications() {
  try {
    console.log('--- Starting Socket Notification Test ---');

    // 1. Setup Users
    console.log('Step 1: Logging in users...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, { email: 'admin@example.com', password: 'Password123!' });
    const officerLogin = await axios.post(`${API_URL}/auth/login`, { email: 'officer@example.com', password: 'Password123!' });
    const citizenLogin = await axios.post(`${API_URL}/auth/login`, { email: 'citizen@example.com', password: 'Password123!' });

    const adminToken = adminLogin.data.accessToken;
    const officerToken = officerLogin.data.accessToken;
    const citizenToken = citizenLogin.data.accessToken;
    
    const adminId = adminLogin.data.user._id;
    const officerId = officerLogin.data.user._id;
    const citizenId = citizenLogin.data.user._id;

    // 2. Connect Sockets
    console.log('Step 2: Connecting sockets...');
    const adminSocket = io(SOCKET_URL, { auth: { token: adminToken } });
    const officerSocket = io(SOCKET_URL, { auth: { token: officerToken } });
    const citizenSocket = io(SOCKET_URL, { auth: { token: citizenToken } });

    await new Promise(resolve => adminSocket.on('connect', resolve));
    await new Promise(resolve => officerSocket.on('connect', resolve));
    await new Promise(resolve => citizenSocket.on('connect', resolve));
    console.log('All sockets connected.');

    // 3. Test: Issue Creation -> Admin receives notification
    console.log('Step 3: Testing issue creation -> Admin notification...');
    const categoriesRes = await axios.get(`${API_URL}/categories`);
    const categoryId = categoriesRes.data.categories[0]._id;

    const newIssuePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Admin did not receive issue:new event')), 5000);
      adminSocket.on('issue:new', (data) => {
        clearTimeout(timeout);
        console.log('✅ Admin received issue:new:', data.title);
        resolve(data);
      });
    });

    const issueRes = await axios.post(`${API_URL}/issues`, {
      title: 'Socket Test Issue',
      description: 'Testing real-time notifications',
      category: categoryId,
      latitude: 12.97,
      longitude: 77.59,
      address: 'Socket St',
      ward: 'Ward 1'
    }, { headers: { Authorization: `Bearer ${citizenToken}` } });

    const issueId = issueRes.data.issue._id;
    await newIssuePromise;

    // 4. Test: Assignment -> Officer receives notification
    console.log('Step 4: Testing assignment -> Officer notification...');
    const assignmentPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Officer did not receive issue:assigned event')), 5000);
      officerSocket.on('issue:assigned', (data) => {
        clearTimeout(timeout);
        console.log('✅ Officer received issue:assigned:', data.title);
        resolve(data);
      });
    });

    await axios.post(`${API_URL}/admin/assign`, {
      issueId,
      officerId,
      slaDeadline: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    await assignmentPromise;

    // 5. Test: Status Update -> Citizen receives notification
    console.log('Step 5: Testing status update -> Citizen notification...');
    const statusPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Citizen did not receive issue:status_changed event')), 5000);
      citizenSocket.on('issue:status_changed', (data) => {
        clearTimeout(timeout);
        console.log('✅ Citizen received issue:status_changed:', data.status);
        resolve(data);
      });
    });

    await axios.patch(`${API_URL}/issues/${issueId}/status`, {
      status: 'resolved'
    }, { headers: { Authorization: `Bearer ${officerToken}` } });

    await statusPromise;

    console.log('--- All Socket Notification Tests Passed! ---');
    adminSocket.disconnect();
    officerSocket.disconnect();
    citizenSocket.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('--- Socket Notification Test Failed! ---');
    console.error(error.message);
    if (error.response) console.error('API Error:', error.response.data);
    process.exit(1);
  }
}

testSocketNotifications();
