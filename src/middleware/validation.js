const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number');

const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 255 })
  .withMessage('Name must be between 2 and 255 characters');

const companyNameValidation = body('company_name')
  .trim()
  .isLength({ min: 2, max: 255 })
  .withMessage('Company name must be between 2 and 255 characters');

const phoneValidation = body('phone')
  .optional()
  .isMobilePhone()
  .withMessage('Please provide a valid phone number');

const countryValidation = body('country')
  .notEmpty()
  .withMessage('Country is required');

// Authentication validations
const signupValidation = [
  companyNameValidation,
  nameValidation,
  emailValidation,
  passwordValidation,
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  countryValidation,
  phoneValidation,
  handleValidationErrors
];

const signinValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  body('company_name').optional().trim(),
  body('role').isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  handleValidationErrors
];

// Employee validations
const createEmployeeValidation = [
  nameValidation,
  emailValidation,
  passwordValidation,
  body('manager_id').isInt({ min: 1 }).withMessage('Valid manager ID is required'),
  body('employee_id').optional().trim().isLength({ max: 50 }),
  phoneValidation,
  body('department').optional().trim().isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('hire_date').optional().isISO8601().withMessage('Invalid hire date'),
  body('chief_id').optional().isInt({ min: 1 }).withMessage('Invalid chief ID'),
  handleValidationErrors
];

const updateEmployeeValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('manager_id').optional().isInt({ min: 1 }),
  body('employee_id').optional().trim().isLength({ max: 50 }),
  phoneValidation,
  body('department').optional().trim().isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('hire_date').optional().isISO8601(),
  body('chief_id').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean(),
  handleValidationErrors
];

// Manager validations
const createManagerValidation = [
  nameValidation,
  emailValidation,
  passwordValidation,
  phoneValidation,
  body('department').optional().trim().isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('approval_limit').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Invalid approval limit'),
  handleValidationErrors
];

const updateManagerValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid manager ID is required'),
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('email').optional().isEmail().normalizeEmail(),
  phoneValidation,
  body('department').optional().trim().isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('approval_limit').optional().isDecimal({ decimal_digits: '0,2' }),
  body('is_active').optional().isBoolean(),
  handleValidationErrors
];

// Expense request validations
const createExpenseValidation = [
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
  body('category')
    .isIn(['travel', 'meals', 'accommodation', 'transportation', 'office_supplies', 'equipment', 'training', 'marketing', 'entertainment', 'other'])
    .withMessage('Invalid expense category'),
  body('payment_method')
    .isIn(['cash', 'credit_card', 'bank_transfer', 'company_card', 'personal_reimbursement'])
    .withMessage('Invalid payment method'),
  body('amount')
    .isDecimal({ decimal_digits: '0,2' })
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (parseFloat(value) > 999999.99) {
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
  handleValidationErrors
];

const updateExpenseValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid expense ID is required'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }),
  body('expense_date').optional().isISO8601(),
  body('category').optional().isIn(['travel', 'meals', 'accommodation', 'transportation', 'office_supplies', 'equipment', 'training', 'marketing', 'entertainment', 'other']),
  body('payment_method').optional().isIn(['cash', 'credit_card', 'bank_transfer', 'company_card', 'personal_reimbursement']),
  body('amount').optional().isDecimal({ decimal_digits: '0,2' }),
  body('currency').optional().isLength({ min: 3, max: 3 }).isAlpha(),
  body('location').optional().trim().isLength({ max: 255 }),
  body('remarks').optional().trim().isLength({ max: 1000 }),
  body('status').optional().isIn(['draft', 'submitted']),
  handleValidationErrors
];

// Approval validations
const approvalActionValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid request ID is required'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('comments').optional().trim().isLength({ max: 500 }).withMessage('Comments cannot exceed 500 characters'),
  handleValidationErrors
];

// Approval rule validations
const approvalRuleValidation = [
  body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  body('approver_sequence').isArray({ min: 1 }).withMessage('At least one approver is required'),
  body('approver_sequence.*').isInt({ min: 1 }).withMessage('All approver IDs must be valid'),
  body('threshold_percentage').isDecimal({ decimal_digits: '0,2' }).custom((value) => {
    const num = parseFloat(value);
    if (num < 0 || num > 100) {
      throw new Error('Threshold percentage must be between 0 and 100');
    }
    return true;
  }),
  body('minimum_threshold_amount').isDecimal({ decimal_digits: '0,2' }).custom((value) => {
    if (parseFloat(value) < 0) {
      throw new Error('Minimum threshold amount cannot be negative');
    }
    return true;
  }),
  body('approval_description').optional().trim().isLength({ max: 1000 }),
  body('requires_chief_approval').optional().isBoolean(),
  body('chief_approval_threshold').optional().isDecimal({ decimal_digits: '0,2' }),
  handleValidationErrors
];

// Query parameter validations
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const expenseFilterValidation = [
  query('status').optional().isIn(['draft', 'submitted', 'in_progress', 'approved', 'rejected', 'cancelled']),
  query('category').optional().isIn(['travel', 'meals', 'accommodation', 'transportation', 'office_supplies', 'equipment', 'training', 'marketing', 'entertainment', 'other']),
  query('from_date').optional().isISO8601(),
  query('to_date').optional().isISO8601(),
  query('min_amount').optional().isDecimal(),
  query('max_amount').optional().isDecimal(),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  signupValidation,
  signinValidation,
  createEmployeeValidation,
  updateEmployeeValidation,
  createManagerValidation,
  updateManagerValidation,
  createExpenseValidation,
  updateExpenseValidation,
  approvalActionValidation,
  approvalRuleValidation,
  paginationValidation,
  expenseFilterValidation
};