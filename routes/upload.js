import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from './auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    if (!fs.existsSync('uploads/')) {
      fs.mkdirSync('uploads/', { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'), false);
    }
  }
});

// Upload single file
router.post('/single', verifyToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the file URL (in production, this would be a full URL)
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Upload multiple files
router.post('/multiple', verifyToken, (req, res) => {
  // Use multer middleware
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ 
        message: 'File upload error', 
        error: err.message 
      });
    }

    try {
      console.log('Upload request received:', {
        files: req.files?.length || 0,
        user: req.user?.userId,
        body: req.body
      });

      if (!req.files || req.files.length === 0) {
        console.log('No files uploaded');
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const fileUrls = req.files.map(file => ({
        fileUrl: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));
      
      console.log('Files uploaded successfully:', fileUrls);
      
      res.json({
        message: 'Files uploaded successfully',
        files: fileUrls
      });
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ 
        message: 'Upload processing failed',
        error: error.message 
      });
    }
  });
});

export default router;
