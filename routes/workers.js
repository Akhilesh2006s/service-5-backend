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
router.get('/', verifyToken, (req, res) => {
  try {
    // Only government officials and admins can view all workers
    if (req.user.role !== 'government' && req.user.role !== 'government_official' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove password from response
    const workersWithoutPassword = workers.map(worker => {
      const { password, ...workerWithoutPassword } = worker;
      return workerWithoutPassword;
    });

    res.json(workersWithoutPassword);
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
router.post('/', verifyToken, (req, res) => {
  try {
    // Only government officials and admins can create workers
    if (req.user.role !== 'government' && req.user.role !== 'government_official' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, phone, department, designation } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !department || !designation) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email already exists
    const existingWorker = workers.find(w => w.email === email);
    if (existingWorker) {
      return res.status(400).json({ message: 'Worker with this email already exists' });
    }

    // Create new worker
    const newWorker = {
      id: Math.max(...workers.map(w => w.id)) + 1,
      name,
      email,
      phone,
      department,
      designation,
      status: 'available',
      avatar: '',
      password: 'worker123' // Default password, in production this would be generated/hashed
    };

    workers.push(newWorker);

    // Remove password from response
    const { password, ...workerWithoutPassword } = newWorker;
    res.status(201).json(workerWithoutPassword);
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
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const worker = workers.find(w => w.email === email && w.password === password);
    
    if (!worker) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Remove password from response
    const { password: _, ...workerWithoutPassword } = worker;
    
    // In production, you would generate a JWT token here
    res.json({
      message: 'Login successful',
      worker: workerWithoutPassword,
      token: 'mock-worker-token' // In production, this would be a real JWT
    });
  } catch (error) {
    console.error('Error in worker login:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;
