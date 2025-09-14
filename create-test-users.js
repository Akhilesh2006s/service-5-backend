import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Department from './models/Department.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://akhileshsamayamanthula:rxvIPIT4Bzobk9Ne@cluster0.4ej8ne2.mongodb.net/govt?retryWrites=true&w=majority&appName=Cluster0';

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create admin user first to get the ID for createdBy
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        verified: true,
        permissions: ['create_officials', 'create_workers', 'assign_tasks', 'generate_reports', 'manage_departments']
      });
      await adminUser.save();
      console.log('Created admin user');
    }

    // Create test departments first
    const departments = [
      {
        name: 'Public Works Department',
        code: 'PWD',
        description: 'Manages public infrastructure and maintenance',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Health Department',
        code: 'HD',
        description: 'Manages public health services',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'VMC',
        code: 'VMC',
        description: 'Vijayawada Municipal Corporation',
        isActive: true,
        createdBy: adminUser._id
      }
    ];

    for (const deptData of departments) {
      const existingDept = await Department.findOne({ $or: [{ code: deptData.code }, { name: deptData.name }] });
      if (!existingDept) {
        const dept = new Department(deptData);
        await dept.save();
        console.log(`Created department: ${dept.name}`);
      } else {
        console.log(`Department already exists: ${deptData.name}`);
      }
    }

    // Create test users
    const testUsers = [
      {
        name: 'Akhilesh',
        email: 'akhilesh@gmail.com',
        password: 'gov123',
        role: 'government',
        department: 'VMC',
        designation: 'head',
        verified: true,
        permissions: ['assign_tasks', 'generate_reports']
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@health.gov',
        password: 'gov123',
        role: 'government',
        department: 'HD',
        designation: 'Health Director',
        verified: true,
        permissions: ['assign_tasks', 'generate_reports']
      },
      {
        name: 'Eng. David Wilson',
        email: 'david.wilson@publicworks.gov',
        password: 'gov123',
        role: 'government',
        department: 'PWD',
        designation: 'Public Works Director',
        verified: true,
        permissions: ['assign_tasks', 'generate_reports']
      },
      {
        name: 'Worker User',
        email: 'worker@example.com',
        password: 'worker123',
        role: 'worker',
        department: 'PWD',
        designation: 'Field Worker',
        assignedTo: adminUser._id, // Assign to admin user
        verified: true
      },
      {
        name: 'Citizen User',
        email: 'citizen@example.com',
        password: 'citizen123',
        role: 'citizen',
        aadhaarNumber: '123456789012',
        location: 'Vijayawada',
        verified: true
      }
    ];

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email },
          ...(userData.aadhaarNumber ? [{ aadhaarNumber: userData.aadhaarNumber }] : [])
        ]
      });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Created user: ${user.name} (${user.role})`);
        
        // Add government users to their departments
        if (user.role === 'government') {
          const dept = await Department.findOne({ code: user.department });
          if (dept) {
            dept.officials.push(user._id);
            await dept.save();
            console.log(`Added ${user.name} to ${dept.name}`);
          }
        }
      } else {
        console.log(`User already exists: ${userData.name}`);
      }
    }

    console.log('Test users created successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Government: akhilesh@gmail.com / gov123');
    console.log('Worker: worker@example.com / worker123');
    console.log('Citizen: citizen@example.com / citizen123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestUsers();
