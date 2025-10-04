const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  signupValidation, 
  signinValidation,
  handleValidationErrors 
} = require('../middleware/validation');

// Public routes
router.post('/signup', signupValidation, authController.signup);
router.post('/signin', signinValidation, authController.signin);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);

router.put('/profile', 
  authenticateToken,
  [
    body('name').optional().trim().isLength({ min: 2, max: 255 }),
    body('phone').optional().isMobilePhone(),
    body('department').optional().trim().isLength({ max: 100 }),
    body('position').optional().trim().isLength({ max: 100 }),
    handleValidationErrors
  ],
  authController.updateProfile
);

router.put('/change-password',
  authenticateToken,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    handleValidationErrors
  ],
  authController.changePassword
);

router.post('/logout', authenticateToken, authController.logout);

module.exports = router;