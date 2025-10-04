const express = require('express');
const router = express.Router();

const managerController = require('../controllers/managerController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  validateApprovalAction, 
  validateId, 
  validatePaginationQuery 
} = require('../middleware/validation');

// Apply authentication and manager authorization to all routes
router.use(authenticateToken);
router.use(authorizeRoles('manager'));

// Dashboard
router.get('/dashboard', managerController.getDashboard);

// Approval management
router.get('/approvals', validatePaginationQuery, managerController.getApprovalQueue);
router.post('/approvals/:id/process', validateId, validateApprovalAction, managerController.processApproval);

// Approval history
router.get('/history', validatePaginationQuery, managerController.getApprovalHistory);

// Employee management
router.get('/employees', managerController.getMyEmployees);

module.exports = router;