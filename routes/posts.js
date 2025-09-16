import express from 'express';
import Post from '../models/Post.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get all posts (all authenticated users can see all posts)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, category, priority, department } = req.query;
    const filter = {};

    // All authenticated users can see all posts (like Twitter/Instagram)
    // Remove the role-based filtering to allow everyone to see all posts

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;

    const posts = await Post.find(filter)
      .populate('author', 'name username role')
      .populate('assignedTo', 'name username designation')
      .populate('assignedBy', 'name username designation')
      .populate('upvotes', 'name')
      .populate('comments.author', 'name role')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single post
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name username role')
      .populate('assignedTo', 'name username designation')
      .populate('upvotes', 'name')
      .populate('comments.author', 'name role');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // All authenticated users can see all posts (like Twitter/Instagram)
    // Remove the role-based access restriction

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new post (all authenticated users)
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('Creating post with data:', req.body);
    
    const post = new Post({
      ...req.body,
      author: req.user.userId
    });

    await post.save();
    await post.populate('author', 'name username role');

    console.log('Post created successfully:', post);
    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Update post (general update for all fields)
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    console.log('Updating post:', req.params.id, 'with data:', req.body);
    
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('author', 'name username role')
     .populate('assignedTo', 'name username designation')
     .populate('upvotes', 'name')
     .populate('comments.author', 'name role');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    console.log('Post updated successfully:', post);
    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update post status (government users only)
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'government') {
      return res.status(403).json({ message: 'Only government users can update status' });
    }

    const { status, resolutionNotes, resolutionImages, assignedTo } = req.body;
    
    const updateData = { status };
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (resolutionImages) updateData.resolutionImages = resolutionImages;
    if (assignedTo) updateData.assignedTo = assignedTo;
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('author', 'name username role')
     .populate('assignedTo', 'name username designation');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upvote post
router.post('/:id/upvote', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user.userId;
    const upvoteIndex = post.upvotes.indexOf(userId);

    if (upvoteIndex > -1) {
      // Remove upvote
      post.upvotes.splice(upvoteIndex, 1);
    } else {
      // Add upvote
      post.upvotes.push(userId);
    }

    await post.save();
    post.calculateEngagementScore();
    await post.save();

    res.json({ upvoted: upvoteIndex === -1, upvoteCount: post.upvotes.length });
  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      author: req.user.userId,
      text
    });

    await post.save();
    post.calculateEngagementScore();
    await post.save();

    await post.populate('comments.author', 'name role');
    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get statistics (government users only)
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'government') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalPosts = await Post.countDocuments();
    const pendingPosts = await Post.countDocuments({ status: 'pending' });
    const inProgressPosts = await Post.countDocuments({ status: 'in-progress' });
    const resolvedPosts = await Post.countDocuments({ status: 'resolved' });
    const criticalPosts = await Post.countDocuments({ priority: 'critical' });

    // Category breakdown
    const categoryStats = await Post.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Priority breakdown
    const priorityStats = await Post.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      totalPosts,
      pendingPosts,
      inProgressPosts,
      resolvedPosts,
      criticalPosts,
      categoryStats,
      priorityStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

