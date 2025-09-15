import express from 'express';
import { verifyToken } from './auth.js';

const router = express.Router();

// Mock workers data (in production, this would be from MongoDB)
let workers = [
  { 
    id: 1, 
    name: 'Mike Johnson', 
    email: 'mike.johnson@city.gov', 
    phone: '+1-555-0101', 
    department: 'Road Maintenance', 
    status: 'available', 
    avatar: '', 
    designation: 'Senior Technician',
    password: 'worker123' // In production, this would be hashed
  },
  { 
    id: 2, 
    name: 'Sarah Davis', 
    email: 'sarah.davis@city.gov', 
    phone: '+1-555-0102', 
    department: 'Sanitation', 
    status: 'busy', 
    avatar: '', 
    designation: 'Field Supervisor',
    password: 'worker123'
  },
  { 
    id: 3, 
    name: 'Tom Wilson', 
    email: 'tom.wilson@city.gov', 
    phone: '+1-555-0103', 
    department: 'Public Works', 
    status: 'available', 
    avatar: '', 
    designation: 'Maintenance Worker',
    password: 'worker123'
  },
  { 
    id: 4, 
    name: 'Lisa Brown', 
    email: 'lisa.brown@city.gov', 
    phone: '+1-555-0104', 
    department: 'Public Works', 
    status: 'available', 
    avatar: '', 
    designation: 'Equipment Operator',
    password: 'worker123'
  }
];

// Get all workers (for government officials)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Only government officials and admins can view all workers
    if (req.user.role !== 'government' && req.user.role !== 'government_official' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Import User model
    const User = (await import('../models/User.js')).default;

    // Fetch workers from database
    const workers = await User.find({ role: 'worker' }).select('-password');

    // Transform to match expected format
    const workersWithStatus = workers.map(worker => ({
      id: worker._id,
      name: worker.name,
      email: worker.email,
      phone: worker.phone || '',
      department: worker.department,
      designation: worker.designation,
      status: 'available', // Default status
      avatar: worker.avatar || ''
    }));

    res.json(workersWithStatus);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ message: 'Failed to fetch workers' });
  }
});

// Get worker by ID
router.get('/:id', verifyToken, (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const worker = workers.find(w => w.id === workerId);
    
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Remove password from response
    const { password, ...workerWithoutPassword } = worker;
    res.json(workerWithoutPassword);
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({ message: 'Failed to fetch worker' });
  }
});

// Create new worker (for government officials)
router.post('/', verifyToken, async (req, res) => {
  try {
    // Only government officials and admins can create workers
    if (req.user.role !== 'government' && req.user.role !== 'government_official' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, phone, department, designation, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !department || !designation || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Import User model
    const User = (await import('../models/User.js')).default;

    // Check if email already exists
    const existingWorker = await User.findOne({ email });
    if (existingWorker) {
      return res.status(400).json({ message: 'Worker with this email already exists' });
    }

    // Create new worker in database
    const newWorker = new User({
      name,
      email,
      password,
      role: 'worker',
      department,
      designation,
      phone,
      verified: true
    });

    await newWorker.save();

    res.status(201).json({
      id: newWorker._id,
      name: newWorker.name,
      email: newWorker.email,
      phone: newWorker.phone,
      role: newWorker.role,
      department: newWorker.department,
      designation: newWorker.designation,
      status: 'available',
      avatar: newWorker.avatar || ''
    });
  } catch (error) {
    console.error('Error creating worker:', error);
    res.status(500).json({ message: 'Failed to create worker' });
  }
});

// Update worker
router.patch('/:id', verifyToken, (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const workerIndex = workers.findIndex(w => w.id === workerId);
    
    if (workerIndex === -1) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Update worker fields
    workers[workerIndex] = { ...workers[workerIndex], ...req.body };

    // Remove password from response
    const { password, ...workerWithoutPassword } = workers[workerIndex];
    res.json(workerWithoutPassword);
  } catch (error) {
    console.error('Error updating worker:', error);
    res.status(500).json({ message: 'Failed to update worker' });
  }
});

// Delete worker
router.delete('/:id', verifyToken, (req, res) => {
  try {
    // Only government officials and admins can delete workers
    if (req.user.role !== 'government' && req.user.role !== 'government_official' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const workerId = parseInt(req.params.id);
    const workerIndex = workers.findIndex(w => w.id === workerId);
    
    if (workerIndex === -1) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    workers.splice(workerIndex, 1);
    res.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    console.error('Error deleting worker:', error);
    res.status(500).json({ message: 'Failed to delete worker' });
  }
});

// Worker login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Import User model
    const User = (await import('../models/User.js')).default;
    
    // Find worker in database
    const worker = await User.findOne({ email, role: 'worker' });
    
    if (!worker) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await worker.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign(
      { 
        userId: worker._id, 
        role: worker.role,
        department: worker.department,
        designation: worker.designation
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        role: worker.role,
        department: worker.department,
        designation: worker.designation,
        status: 'available'
      },
      token: token
    });
  } catch (error) {
    console.error('Error in worker login:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;
