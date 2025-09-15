import express from 'express';
import User from '../models/User.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get users by role (for admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Only admins can view all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { role } = req.query;
    let query = {};
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all government users (for assignment purposes)
router.get('/government', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'government') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const governmentUsers = await User.find({ role: 'government' })
      .select('name email department designation')
      .sort({ name: 1 });

    res.json(governmentUsers);
  } catch (error) {
    console.error('Get government users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (for admin)
router.post('/', verifyToken, async (req, res) => {
  try {
    // Only admins can create users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, password, role, department, designation, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      department: role === 'government' || role === 'worker' ? department : undefined,
      designation: role === 'government' || role === 'worker' ? designation : undefined,
      phone: role === 'government' || role === 'worker' ? phone : undefined,
      verified: true // Admin-created users are verified by default
    });

    await user.save();

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      phone: user.phone,
      verified: user.verified,
      avatar: user.avatar || ''
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error during user creation' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password updates through this route
    delete updates.role; // Don't allow role changes
    delete updates._id; // Don't allow ID changes

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

