const axios = require('axios');

async function testRegistration() {
  try {
    console.log('Testing Registration with valid domain...');
    const response = await axios.post('http://localhost:5001/api/auth/register', {
      name: 'Test Agent',
      email: 'testagent@gmail.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      ward: 'Ward 1'
    });
    
    console.log('✅ Success! Response:', response.data);
  } catch (error) {
    console.error('❌ Failed! Error:', error.response?.data || error.message);
  }
}

testRegistration();
