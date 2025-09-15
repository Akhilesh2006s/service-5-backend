import express from 'express';
import Task from '../models/Task.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get tasks for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, department } = req.query;
    const filter = {};

    if (req.user.role === 'worker') {
      filter.assignedTo = req.user.userId;
    } else if (req.user.role === 'government') {
      filter.assignedBy = req.user.userId;
    }

    if (status) filter.status = status;
    if (department) filter.department = department;

    const tasks = await Task.find(filter)
      .populate('post', 'title description location category priority')
      .populate('assignedTo', 'name email designation')
      .populate('assignedBy', 'name email designation')
      .populate('digitalSignature.signedBy', 'name email designation')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task (government officials only)
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('Create task request:', req.body);
    console.log('User info:', req.user);
    
    if (req.user.role !== 'government') {
      return res.status(403).json({ message: 'Only government officials can create tasks' });
    }

    const { postId, assignedTo, description, instructions, priority } = req.body;

    if (!postId || !assignedTo) {
      return res.status(400).json({ message: 'Post ID and assigned worker are required' });
    }

    // Verify the post exists
    const post = await Post.findById(postId);
    if (!post) {
      console.log('Post not found with ID:', postId);
      return res.status(404).json({ message: 'Post not found' });
    }

    // Verify the worker exists and is in the same department
    const worker = await User.findById(assignedTo);
    if (!worker || worker.role !== 'worker') {
      console.log('Worker not found or invalid role:', assignedTo, worker);
      return res.status(400).json({ message: 'Invalid worker assignment' });
    }

    // Check if worker is in the same department (if user has department info)
    if (req.user.department && worker.department !== req.user.department) {
      console.log('Department mismatch:', req.user.department, 'vs', worker.department);
      return res.status(400).json({ message: 'Worker must be in the same department' });
    }

    const task = new Task({
      post: postId,
      assignedTo,
      assignedBy: req.user.userId,
      department: req.user.department || worker.department,
      description,
      instructions,
      priority: priority || 'medium'
    });

    await task.save();

    // Update post status
    post.status = 'assigned';
    post.assignedTo = assignedTo;
    await post.save();

    await task.populate('post', 'title description location category priority');
    await task.populate('assignedTo', 'name email designation');

    console.log('Task created successfully:', task);
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status (workers only)
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can update task status' });
    }

    const { status, workerRemarks, workProof } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedTo.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    task.status = status;
    if (workerRemarks) task.workerRemarks = workerRemarks;
    if (workProof) task.workProof = workProof;

    if (status === 'completed') {
      task.completionDate = new Date();
    }

    await task.save();

    res.json(task);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review and approve task (government officials only)
router.patch('/:id/review', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'government') {
      return res.status(403).json({ message: 'Only government officials can review tasks' });
    }

    const { status, officialRemarks, digitalSignature, report } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    task.status = status;
    if (officialRemarks) task.officialRemarks = officialRemarks;
    if (digitalSignature) {
      task.digitalSignature = {
        ...digitalSignature,
        signedBy: req.user.userId,
        signedAt: new Date()
      };
    }
    if (report) {
      task.report = report;
      task.reviewDate = new Date();
    }

    await task.save();

    // Update post status
    if (status === 'closed') {
      const post = await Post.findById(task.post);
      if (post) {
        post.status = 'resolved';
        post.resolvedAt = new Date();
        await post.save();
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Review task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create worker (government officials only)
router.post('/workers', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'government') {
      return res.status(403).json({ message: 'Only government officials can create workers' });
    }

    const { name, email, password, designation, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Use department from request body, fallback to user's department
    let workerDepartment = department || req.user.department;
    
    // If department is missing from token, fetch it from database
    if (!workerDepartment) {
      console.log('Department missing from token, fetching from database...');
      const user = await User.findById(req.user.userId).select('department');
      if (user && user.department) {
        workerDepartment = user.department;
        console.log('Found department in database:', workerDepartment);
      }
    }
    
    if (!workerDepartment) {
      return res.status(400).json({ message: 'Department is required for creating workers' });
    }

    const worker = new User({
      name,
      email,
      password,
      role: 'worker',
      department: workerDepartment,
      designation,
      assignedTo: req.user.userId,
      verified: true
    });

    await worker.save();

    res.status(201).json({
      message: 'Worker created successfully',
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        department: worker.department,
        designation: worker.designation
      }
    });
  } catch (error) {
    console.error('Create worker error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get workers for current department
router.get('/workers', verifyToken, async (req, res) => {
  try {
    console.log('GET /workers - User info:', req.user);
    
    if (!['government', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If department is missing from token, fetch it from database
    let userDepartment = req.user.department;
    if (!userDepartment) {
      console.log('Department missing from token, fetching from database...');
      const user = await User.findById(req.user.userId).select('department');
      if (user && user.department) {
        userDepartment = user.department;
        console.log('Found department in database:', userDepartment);
      } else {
        return res.status(400).json({ 
          message: 'User department information is missing. Please contact administrator.' 
        });
      }
    }

    const workers = await User.find({ 
      role: 'worker',
      department: userDepartment 
    }).select('-password').sort({ name: 1 });

    res.json(workers);
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

