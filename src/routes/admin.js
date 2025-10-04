const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', 
  [
    query('role').optional().isIn(['admin', 'manager', 'employee']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim().isLength({ max: 255 }),
    handleValidationErrors
  ],
  adminController.getUsers
);

router.post('/users',
  [
    body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
    body('manager_id').optional().isInt({ min: 1 }).withMessage('Invalid manager ID'),
    body('department').optional().trim().isLength({ max: 100 }),
    body('employee_id').optional().trim().isLength({ max: 50 }),
    body('is_manager_approver').optional().isBoolean(),
    handleValidationErrors
  ],
  adminController.createUser
);

router.put('/users/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('name').optional().trim().isLength({ min: 2, max: 255 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'manager', 'employee']),
    body('manager_id').optional().isInt({ min: 1 }),
    body('department').optional().trim().isLength({ max: 100 }),
    body('employee_id').optional().trim().isLength({ max: 50 }),
    body('is_manager_approver').optional().isBoolean(),
    body('is_active').optional().isBoolean(),
    handleValidationErrors
  ],
  adminController.updateUser
);

router.delete('/users/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    handleValidationErrors
  ],
  adminController.deleteUser
);

// Expense Categories
router.get('/expense-categories', adminController.getExpenseCategories);

router.post('/expense-categories',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('description').optional().trim().isLength({ max: 500 }),
    handleValidationErrors
  ],
  adminController.createExpenseCategory
);

router.put('/expense-categories/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('is_active').optional().isBoolean(),
    handleValidationErrors
  ],
  adminController.updateExpenseCategory
);

// Approval Workflows
router.get('/approval-workflows', adminController.getApprovalWorkflows);

router.post('/approval-workflows',
  [
    body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('is_default').optional().isBoolean(),
    body('steps').optional().isArray().withMessage('Steps must be an array'),
    body('steps.*.step_number').isInt({ min: 1 }).withMessage('Step number must be a positive integer'),
    body('steps.*.step_name').trim().isLength({ min: 2, max: 255 }).withMessage('Step name is required'),
    body('steps.*.approver_type').isIn(['specific_user', 'role', 'manager', 'department_head', 'finance', 'cfo']),
    body('steps.*.approver_id').optional().isInt({ min: 1 }),
    body('steps.*.approver_role').optional().trim().isLength({ max: 100 }),
    body('steps.*.is_required').optional().isBoolean(),
    body('steps.*.condition_amount_min').optional().isDecimal({ decimal_digits: '0,2' }),
    body('steps.*.condition_amount_max').optional().isDecimal({ decimal_digits: '0,2' }),
    body('steps.*.auto_approve_threshold').optional().isDecimal({ decimal_digits: '0,2' }),
    handleValidationErrors
  ],
  adminController.createApprovalWorkflow
);

// Company Settings
router.get('/company-settings', adminController.getCompanySettings);

router.put('/company-settings',
  [
    body('name').optional().trim().isLength({ min: 2, max: 255 }),
    body('country').optional().trim().isLength({ min: 2, max: 100 }),
    body('currency').optional().trim().isLength({ min: 3, max: 10 }),
    body('timezone').optional().trim().isLength({ max: 50 }),
    handleValidationErrors
  ],
  adminController.updateCompanySettings
);

// Reports
router.get('/reports/expenses',
  [
    query('start_date').optional().isISO8601().withMessage('Invalid start date'),
    query('end_date').optional().isISO8601().withMessage('Invalid end date'),
    query('user_id').optional().isInt({ min: 1 }),
    query('category_id').optional().isInt({ min: 1 }),
    query('status').optional().isIn(['draft', 'submitted', 'in_approval', 'approved', 'rejected', 'paid']),
    query('group_by').optional().isIn(['day', 'week', 'month', 'year']),
    handleValidationErrors
  ],
  adminController.getExpenseReports
);

module.exports = router;