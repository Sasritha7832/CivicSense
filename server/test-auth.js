
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function testAuthFlow() {
  try {
    console.log('--- Starting Auth Flow Test ---');

    // 1. Register
    console.log('Step 1: Registering...');
    const regData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      ward: 'Ward 1'
    };
    
    // Connect to DB to get OTP
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean up existing test user
    await User.deleteOne({ email: regData.email });

    const regRes = await axios.post(`${API_URL}/auth/register`, regData);
    console.log('Registration response:', regRes.data);
    const userId = regRes.data.userId;

    // 2. Get OTP from DB
    const user = await User.findById(userId);
    const otp = user.otp;
    console.log(`Step 2: Found OTP in DB: ${otp}`);

    // 3. Verify OTP
    console.log('Step 3: Verifying OTP...');
    const verifyRes = await axios.post(`${API_URL}/auth/verify-otp`, { userId, otp });
    console.log('Verification response:', verifyRes.data);
    const accessToken = verifyRes.data.accessToken;

    // 4. Login
    console.log('Step 4: Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: regData.email,
      password: regData.password
    });
    console.log('Login response:', loginRes.data);

    // 5. Get Me
    console.log('Step 5: Fetching /me...');
    const meRes = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${loginRes.data.accessToken}` }
    });
    console.log('Me response:', meRes.data);

    console.log('--- Auth Flow Test Passed! ---');
    process.exit(0);
  } catch (error) {
    console.error('--- Auth Flow Test Failed! ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testAuthFlow();
