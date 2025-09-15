import mongoose from 'mongoose';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/local-gov-sphere-connect');
    console.log('Connected to MongoDB');

    // Clear existing test users
    await User.deleteMany({ email: { $in: ['admin@city.gov', 'official@city.gov', 'worker@city.gov', 'citizen@example.com'] } });
    console.log('Cleared existing test users');

    // Create test users
    const testUsers = [
      {
        name: 'Admin User',
        email: 'admin@city.gov',
        password: 'admin123',
        role: 'admin',
        verified: true
      },
      {
        name: 'Government Official',
        email: 'official@city.gov',
        password: 'official123',
        role: 'government',
        department: 'Public Works',
        designation: 'Senior Officer',
        phone: '+1-555-0100',
        verified: true
      },
      {
        name: 'Field Worker',
        email: 'worker@city.gov',
        password: 'worker123',
        role: 'worker',
        department: 'Public Works',
        designation: 'Field Technician',
        phone: '+1-555-0101',
        verified: true
      },
      {
        name: 'John Citizen',
        email: 'citizen@example.com',
        password: 'citizen123',
        role: 'citizen',
        aadhaarNumber: '123456789012',
        location: 'Downtown',
        verified: true
      }
    ];

    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${userData.name} (${userData.email})`);
    }

    console.log('All test users created successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@city.gov / admin123');
    console.log('Government Official: official@city.gov / official123');
    console.log('Worker: worker@city.gov / worker123');
    console.log('Citizen: citizen@example.com / citizen123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createTestUsers();