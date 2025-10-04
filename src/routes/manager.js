const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const managerController = require('../controllers/managerController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// All manager routes require authentication and manager/admin role
router.use(authenticateToken);
router.use(authorizeRoles('manager', 'admin'));

// Dashboard
router.get('/dashboard', managerController.getDashboard);

// Pending Approvals
router.get('/approvals/pending',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort_by').optional().isIn(['created_at', 'amount_in_company_currency', 'expense_date']),
    query('sort_order').optional().isIn(['ASC', 'DESC']),
    handleValidationErrors
  ],
  managerController.getPendingApprovals
);

// Get specific approval details
router.get('/approvals/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid approval ID is required'),
    handleValidationErrors
  ],
  managerController.getApprovalDetails
);

// Process approval (approve/reject)
router.post('/approvals/:id/process',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid approval ID is required'),
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('comments')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comments cannot exceed 1000 characters'),
    // Custom validation: comments required for reject
    body('comments').custom((value, { req }) => {
      if (req.body.action === 'reject' && (!value || value.trim().length === 0)) {
        throw new Error('Comments are required when rejecting an expense');
      }
      return true;
    }),
    handleValidationErrors
  ],
  managerController.processApproval
);

// Approval History
router.get('/approvals/history',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('action').optional().isIn(['approved', 'rejected']),
    query('start_date').optional().isISO8601().withMessage('Invalid start date'),
    query('end_date').optional().isISO8601().withMessage('Invalid end date'),
    query('user_id').optional().isInt({ min: 1 }),
    handleValidationErrors
  ],
  managerController.getApprovalHistory
);

// Team Management
router.get('/team/members', managerController.getTeamMembers);

router.get('/team/expenses',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'submitted', 'in_approval', 'approved', 'rejected', 'paid']),
    query('user_id').optional().isInt({ min: 1 }),
    query('category_id').optional().isInt({ min: 1 }),
    query('start_date').optional().isISO8601().withMessage('Invalid start date'),
    query('end_date').optional().isISO8601().withMessage('Invalid end date'),
    handleValidationErrors
  ],
  managerController.getTeamExpenses
);

// Statistics
router.get('/stats',
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    handleValidationErrors
  ],
  managerController.getManagerStats
);

module.exports = router;