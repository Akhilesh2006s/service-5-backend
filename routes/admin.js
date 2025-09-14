import express from 'express';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Get all departments (admin only - with full details)
router.get('/departments', verifyToken, requireAdmin, async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('headOfficial', 'name email designation')
      .populate('officials', 'name email designation')
      .populate('workers', 'name email designation')
      .sort({ name: 1 });

    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public departments list (for citizens and other users)
router.get('/departments/public', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .select('name code description')
      .sort({ name: 1 });

    res.json(departments);
  } catch (error) {
    console.error('Get public departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new department
router.post('/departments', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const department = new Department({
      name,
      code: code.toUpperCase(),
      description,
      createdBy: req.user.userId
    });

    await department.save();
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Department with this name or code already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Create government official
router.post('/officials', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, department, designation } = req.body;

    // Check if department exists
    const dept = await Department.findOne({ code: department });
    if (!dept) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const official = new User({
      name,
      email,
      password,
      role: 'government',
      department: dept.code,
      designation,
      verified: true,
      permissions: ['assign_tasks', 'generate_reports']
    });

    await official.save();

    // Add official to department
    dept.officials.push(official._id);
    await dept.save();

    res.status(201).json({
      message: 'Government official created successfully',
      official: {
        id: official._id,
        name: official.name,
        email: official.email,
        department: official.department,
        designation: official.designation
      }
    });
  } catch (error) {
    console.error('Create official error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all officials
router.get('/officials', verifyToken, requireAdmin, async (req, res) => {
  try {
    const officials = await User.find({ role: 'government' })
      .populate('department', 'name code')
      .select('-password')
      .sort({ name: 1 });

    res.json(officials);
  } catch (error) {
    console.error('Get officials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all workers
router.get('/workers', verifyToken, requireAdmin, async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' })
      .populate('department', 'name code')
      .populate('assignedTo', 'name email designation')
      .select('-password')
      .sort({ name: 1 });

    res.json(workers);
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system statistics
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = {
      totalDepartments: await Department.countDocuments(),
      totalOfficials: await User.countDocuments({ role: 'government' }),
      totalWorkers: await User.countDocuments({ role: 'worker' }),
      totalCitizens: await User.countDocuments({ role: 'citizen' }),
      activeDepartments: await Department.countDocuments({ isActive: true })
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

