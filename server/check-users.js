
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civicpulse');
    const admin = await User.findOne({ email: 'admin@civicpulse.com' });
    console.log('Admin exists:', !!admin);
    const officer = await User.findOne({ email: 'officer@civicpulse.com' });
    console.log('Officer exists:', !!officer);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
