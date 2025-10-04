const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Authentication validation rules
const validateSignIn = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Role must be admin, manager, or employee'),
  body('company_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  handleValidationErrors
];

const validateSignUp = [
  body('company_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('admin_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Admin name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Please select a valid country'),
  handleValidationErrors
];

// Employee validation rules
const validateCreateEmployee = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('manager_id')
    .isInt({ min: 1 })
    .withMessage('Please select a valid manager'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Department name cannot exceed 255 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Position cannot exceed 255 characters'),
  handleValidationErrors
];

// Manager validation rules
const validateCreateManager = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Department name cannot exceed 255 characters'),
  handleValidationErrors
];

// Expense validation rules
const validateExpenseRequest = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('amount')
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Amount must be a positive number up to 999,999.99'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .toUpperCase()
    .withMessage('Currency must be a valid 3-letter code'),
  body('expense_date')
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid expense date'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Please select a valid category'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location cannot exceed 255 characters'),
  body('payment_method')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Payment method cannot exceed 100 characters'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks cannot exceed 1000 characters'),
  handleValidationErrors
];

// Approval validation rules
const validateApprovalAction = [
  body('action')
    .isIn(['approved', 'rejected'])
    .withMessage('Action must be either approved or rejected'),
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters'),
  body('approved_amount')
    .optional()
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Approved amount must be a positive number up to 999,999.99'),
  handleValidationErrors
];

// Approval rules validation
const validateApprovalRules = [
  body('approvers')
    .isArray({ min: 1 })
    .withMessage('At least one approver must be specified'),
  body('approvers.*.approver_id')
    .isInt({ min: 1 })
    .withMessage('Approver ID must be a valid integer'),
  body('approvers.*.approver_type')
    .isIn(['manager', 'chief'])
    .withMessage('Approver type must be manager or chief'),
  body('approvers.*.sequence_order')
    .isInt({ min: 1 })
    .withMessage('Sequence order must be a positive integer'),
  body('approvers.*.threshold_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Threshold percentage must be between 0 and 100'),
  body('approvers.*.approval_description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Approval description cannot exceed 1000 characters'),
  handleValidationErrors
];

// Parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

// Query validation
const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'amount', 'expense_date', 'status'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  handleValidationErrors
];

const validateExpenseFilters = [
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'approved', 'rejected'])
    .withMessage('Invalid status filter'),
  query('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Invalid date_from format'),
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Invalid date_to format'),
  query('amount_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be non-negative'),
  query('amount_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be non-negative'),
  handleValidationErrors
];

module.exports = {
  validateSignIn,
  validateSignUp,
  validateCreateEmployee,
  validateCreateManager,
  validateExpenseRequest,
  validateApprovalAction,
  validateApprovalRules,
  validateId,
  validatePaginationQuery,
  validateExpenseFilters,
  handleValidationErrors
};