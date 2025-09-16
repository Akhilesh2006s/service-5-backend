import mongoose from 'mongoose';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/local-gov-sphere-connect');
    console.log('Connected to MongoDB');

    // Clear existing test users
    await User.deleteMany({ username: { $in: ['amenity_forge', 'admin', 'official', 'worker', 'citizen'] } });
    console.log('Cleared existing test users');

    // Create test users
    const testUsers = [
      {
        name: 'Amenity Forge',
        username: 'amenity_forge',
        password: 'Amenity',
        role: 'admin',
        verified: true
      },
      {
        name: 'Admin User',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        verified: true
      },
      {
        name: 'Government Official',
        username: 'official',
        password: 'official123',
        role: 'government',
        department: 'Public Works',
        designation: 'Senior Officer',
        phone: '+1-555-0100',
        verified: true
      },
      {
        name: 'Field Worker',
        username: 'worker',
        password: 'worker123',
        role: 'worker',
        department: 'Public Works',
        designation: 'Field Technician',
        phone: '+1-555-0101',
        verified: true
      },
      {
        name: 'John Citizen',
        username: 'citizen',
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
      console.log(`Created user: ${userData.name} (${userData.username})`);
    }

    console.log('All test users created successfully!');
    console.log('\nTest Credentials:');
    console.log('Main Admin: amenity_forge / Amenity');
    console.log('Admin: admin / admin123');
    console.log('Government Official: official / official123');
    console.log('Worker: worker / worker123');
    console.log('Citizen: citizen / citizen123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createTestUsers();