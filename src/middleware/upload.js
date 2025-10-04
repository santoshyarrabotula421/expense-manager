const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory
    const userDir = path.join(uploadDir, req.user.role, req.user.id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1 // Only one file per request
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'attachment') => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'File too large',
              message: `File size must be less than ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 5242880) / 1024 / 1024)}MB`
            });
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              error: 'Unexpected file field',
              message: `Expected file field name: ${fieldName}`
            });
          }
        }
        
        return res.status(400).json({
          error: 'File upload error',
          message: err.message
        });
      }
      
      // Add file info to request if file was uploaded
      if (req.file) {
        req.uploadedFile = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          relativePath: path.relative(path.join(__dirname, '../../'), req.file.path)
        };
      }
      
      next();
    });
  };
};

// Middleware to delete uploaded file (for cleanup on error)
const deleteUploadedFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting uploaded file:', error);
  }
};

// Middleware to serve uploaded files securely
const serveFile = (req, res, next) => {
  const filename = req.params.filename;
  const userRole = req.user.role;
  const userId = req.user.id;
  
  // Construct file path
  const filePath = path.join(uploadDir, userRole, userId.toString(), filename);
  
  // Check if file exists and belongs to user
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'File not found',
      message: 'The requested file does not exist or you do not have permission to access it'
    });
  }
  
  // Serve the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving file:', err);
      res.status(500).json({
        error: 'File serving error',
        message: 'Internal server error while serving file'
      });
    }
  });
};

module.exports = {
  uploadSingle,
  deleteUploadedFile,
  serveFile
};