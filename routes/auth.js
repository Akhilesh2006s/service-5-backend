import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register new user (Citizens only)
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { name, username, password, role, aadhaarNumber, location, department, designation } = req.body;

    // Only allow citizen registration
    if (role !== 'citizen') {
      return res.status(403).json({ 
        message: 'Only citizens can self-register. Other roles must be created by administrators.' 
      });
    }

    // Check if user already exists
    console.log('Checking if user exists with username:', username);
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('User already exists with username:', username);
      return res.status(400).json({ message: 'User already exists with this username' });
    }

    // Check if Aadhaar number already exists for citizens
    if (aadhaarNumber) {
      console.log('Checking if Aadhaar number exists:', aadhaarNumber);
      const existingAadhaar = await User.findOne({ aadhaarNumber });
      if (existingAadhaar) {
        console.log('User already exists with Aadhaar number:', aadhaarNumber);
        return res.status(400).json({ message: 'User already exists with this Aadhaar number' });
      }
    }

    // Create new citizen user
    console.log('Creating new user with data:', { name, username, role: 'citizen', aadhaarNumber, location });
    const user = new User({
      name,
      username,
      password,
      role: 'citizen',
      aadhaarNumber,
      location,
      verified: true // Citizens are verified by default
    });

    console.log('Saving user to database...');
    await user.save();
    console.log('User saved successfully with ID:', user._id);

    // Generate JWT token
    console.log('Generating JWT token...');
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        department: user.department,
        designation: user.designation
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    console.log('JWT token generated successfully');

    res.status(201).json({
      message: 'Citizen registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        verified: user.verified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        department: user.department,
        designation: user.designation
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        verified: user.verified,
        aadhaarNumber: user.aadhaarNumber,
        location: user.location,
        department: user.department,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Verify token middleware
export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
