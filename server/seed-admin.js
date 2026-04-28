
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civicpulse');
    console.log('Connected to MongoDB');

    // Create Admin
    const adminEmail = 'admin@civicpulse.com';
    let admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      admin = await User.create({
        name: 'Super Admin',
        email: adminEmail,
        passwordHash: hashedPassword,
        role: 'admin',
        isVerified: true,
        ward: 'Central'
      });
      console.log('✅ Admin user created: admin@civicpulse.com / Admin123!');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create Officer
    const officerEmail = 'officer@civicpulse.com';
    let officer = await User.findOne({ email: officerEmail });
    if (!officer) {
      const hashedPassword = await bcrypt.hash('Officer123!', 10);
      officer = await User.create({
        name: 'John Officer',
        email: officerEmail,
        passwordHash: hashedPassword,
        role: 'officer',
        isVerified: true,
        ward: 'Central',
        department: 'Sanitation'
      });
      console.log('✅ Officer user created: officer@civicpulse.com / Officer123!');
    }

    // Seed Categories if empty
    const count = await Category.countDocuments();
    if (count === 0) {
      const categories = [
        { name: 'Roads', icon: '🛣️', description: 'Potholes, street lights, etc.' },
        { name: 'Sanitation', icon: '🗑️', description: 'Garbage, sewage, etc.' },
        { name: 'Water', icon: '💧', description: 'Leaks, supply issues, etc.' },
        { name: 'Electricity', icon: '⚡', description: 'Power outages, loose wires, etc.' }
      ];
      await Category.insertMany(categories);
      console.log('✅ Categories seeded');
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
