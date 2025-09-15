import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import taskRoutes from './routes/tasks.js';
import uploadRoutes from './routes/upload.js';
import workerRoutes from './routes/workers.js';

// Load environment variables from config.env file (if exists) or from system env
try {
  dotenv.config({ path: './config.env' });
} catch (error) {
  // config.env file doesn't exist, use system environment variables
  console.log('Using system environment variables');
}

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/workers', workerRoutes);

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Test endpoint to check uploads directory
app.get('/api/test-uploads', (req, res) => {
  try {
    const uploadsDir = 'uploads/';
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ 
        exists: false, 
        message: 'Uploads directory does not exist',
        files: [],
        workingDirectory: process.cwd()
      });
    }
    
    const files = fs.readdirSync(uploadsDir);
    res.json({ 
      exists: true, 
      message: 'Uploads directory exists',
      files: files,
      workingDirectory: process.cwd(),
      uploadsPath: path.resolve(uploadsDir)
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      message: 'Error reading uploads directory',
      workingDirectory: process.cwd()
    });
  }
});

// Test endpoint to serve a sample image
app.get('/api/test-image', (req, res) => {
  try {
    // Create a simple test image response
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from(testImageData.split(',')[1], 'base64'));
  } catch (error) {
    console.error('Error serving test image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
