const mongoose = require('mongoose');
require('dotenv').config();

const clearDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicpulse';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    // Drop the entire database to clear all records
    await mongoose.connection.db.dropDatabase();
    console.log('✅ All records have been cleared from the database.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear database:', err);
    process.exit(1);
  }
};

clearDB();
