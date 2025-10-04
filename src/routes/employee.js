const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// All employee routes require authentication and employee/manager/admin role
router.use(authenticateToken);
router.use(authorizeRoles('employee', 'manager', 'admin'));

// Dashboard
router.get('/dashboard', employeeController.getDashboard);

// Expenses
router.get('/expenses',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'submitted', 'in_approval', 'approved', 'rejected', 'paid']),
    query('category_id').optional().isInt({ min: 1 }),
    query('start_date').optional().isISO8601().withMessage('Invalid start date'),
    query('end_date').optional().isISO8601().withMessage('Invalid end date'),
    query('search').optional().trim().isLength({ max: 255 }),
    query('sort_by').optional().isIn(['created_at', 'expense_date', 'amount', 'status']),
    query('sort_order').optional().isIn(['ASC', 'DESC']),
    handleValidationErrors
  ],
  employeeController.getExpenses
);

router.get('/expenses/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid expense ID is required'),
    handleValidationErrors
  ],
  employeeController.getExpenseDetails
);

router.post('/expenses',
  employeeController.upload.single('receipt'),
  [
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    body('expense_date')
      .isISO8601()
      .withMessage('Invalid expense date')
      .custom((value) => {
        const expenseDate = new Date(value);
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        if (expenseDate > today) {
          throw new Error('Expense date cannot be in the future');
        }
        if (expenseDate < sixMonthsAgo) {
          throw new Error('Expense date cannot be more than 6 months ago');
        }
        return true;
      }),
    body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
    body('amount')
      .isDecimal({ decimal_digits: '0,2' })
      .custom((value) => {
        const amount = parseFloat(value);
        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        if (amount > 999999.99) {
          throw new Error('Amount cannot exceed 999,999.99');
        }
        return true;
      }),
    body('currency')
      .isLength({ min: 3, max: 3 })
      .isAlpha()
      .withMessage('Currency must be a valid 3-letter code'),
    body('location').optional().trim().isLength({ max: 255 }),
    body('remarks').optional().trim().isLength({ max: 1000 }),
    body('status').optional().isIn(['draft', 'submitted']),
    handleValidationErrors
  ],
  employeeController.createExpense
);

router.put('/expenses/:id',
  employeeController.upload.single('receipt'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid expense ID is required'),
    body('description').optional().trim().isLength({ min: 10, max: 1000 }),
    body('expense_date').optional().isISO8601(),
    body('category_id').optional().isInt({ min: 1 }),
    body('amount').optional().isDecimal({ decimal_digits: '0,2' }),
    body('currency').optional().isLength({ min: 3, max: 3 }).isAlpha(),
    body('location').optional().trim().isLength({ max: 255 }),
    body('remarks').optional().trim().isLength({ max: 1000 }),
    body('status').optional().isIn(['draft', 'submitted']),
    handleValidationErrors
  ],
  employeeController.updateExpense
);

router.delete('/expenses/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid expense ID is required'),
    handleValidationErrors
  ],
  employeeController.deleteExpense
);

router.post('/expenses/:id/submit',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid expense ID is required'),
    handleValidationErrors
  ],
  employeeController.submitExpense
);

// Expense Categories
router.get('/expense-categories', employeeController.getExpenseCategories);

// Currencies
router.get('/currencies', employeeController.getSupportedCurrencies);

// Notifications
router.get('/notifications',
  [
    query('unread_only').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    handleValidationErrors
  ],
  employeeController.getNotifications
);

router.put('/notifications/:id/read',
  [
    param('id').isInt({ min: 1 }).withMessage('Valid notification ID is required'),
    handleValidationErrors
  ],
  employeeController.markNotificationRead
);

router.put('/notifications/read-all', employeeController.markAllNotificationsRead);

module.exports = router;