import express from 'express';
import User from '../models/User.js';
import { verifyToken } from './auth.js';

const router = express.Router();

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

