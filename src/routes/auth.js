const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateSignIn, validateSignUp } = require('../middleware/validation');

// Public routes
router.post('/signup', validateSignUp, authController.signUp);
router.post('/signin', validateSignIn, authController.signIn);

// Protected routes
router.post('/refresh', authenticateToken, authController.refreshToken);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;