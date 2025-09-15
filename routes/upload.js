import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from './auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Ensure uploads directory exists
      const uploadsDir = 'uploads/';
      if (!fs.existsSync(uploadsDir)) {
        console.log('Creating uploads directory...');
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Uploads directory created successfully');
      }
      console.log('Using uploads directory:', uploadsDir);
      cb(null, uploadsDir);
    } catch (error) {
      console.error('Error setting up uploads directory:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
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

    // Return the file URL with full domain
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
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

      // Log each file details
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });

      const fileUrls = req.files.map(file => {
        // Read file as base64 for fallback
        let base64Data = '';
        try {
          const fileBuffer = fs.readFileSync(file.path);
          base64Data = `data:${file.mimetype};base64,${fileBuffer.toString('base64')}`;
        } catch (error) {
          console.error('Error reading file for base64:', error);
        }

        return {
          fileUrl: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          base64Data: base64Data // Fallback for ephemeral file systems
        };
      });
      
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
