// Application constants

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
};

// Expense statuses
const EXPENSE_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  IN_APPROVAL: 'in_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid'
};

// Approval step statuses
const APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SKIPPED: 'skipped'
};

// Approval actions
const APPROVAL_ACTIONS = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ASSIGNED: 'assigned',
  REASSIGNED: 'reassigned',
  ESCALATED: 'escalated',
  AUTO_APPROVED: 'auto_approved'
};

// Notification types
const NOTIFICATION_TYPES = {
  APPROVAL_REQUEST: 'approval_request',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  REMINDER: 'reminder'
};

// Approver types
const APPROVER_TYPES = {
  SPECIFIC_USER: 'specific_user',
  ROLE: 'role',
  MANAGER: 'manager',
  DEPARTMENT_HEAD: 'department_head',
  FINANCE: 'finance',
  CFO: 'cfo'
};

// Rule types
const RULE_TYPES = {
  PERCENTAGE: 'percentage',
  SPECIFIC_APPROVER: 'specific_approver',
  HYBRID: 'hybrid',
  THRESHOLD: 'threshold',
  CATEGORY: 'category'
};

// Rule actions
const RULE_ACTIONS = {
  AUTO_APPROVE: 'auto_approve',
  REQUIRE_APPROVAL: 'require_approval',
  SKIP_STEP: 'skip_step',
  ADD_APPROVER: 'add_approver'
};

// Expense categories (default)
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Travel', description: 'Transportation, flights, car rentals' },
  { name: 'Meals', description: 'Business meals and entertainment' },
  { name: 'Accommodation', description: 'Hotels and lodging' },
  { name: 'Office Supplies', description: 'Stationery, equipment, software' },
  { name: 'Training', description: 'Courses, conferences, certifications' },
  { name: 'Marketing', description: 'Advertising, promotional materials' },
  { name: 'Equipment', description: 'Hardware, tools, machinery' },
  { name: 'Telecommunications', description: 'Phone, internet, communication' },
  { name: 'Professional Services', description: 'Consulting, legal, accounting' },
  { name: 'Other', description: 'Miscellaneous business expenses' }
];

// File upload limits
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  MAX_FILES: 5
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Date formats
const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_DATETIME: 'MMM DD, YYYY HH:mm'
};

// Currency codes (most common)
const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'ZAR', 'TRY', 'BRL', 'INR', 'RUB', 'KRW'
];

// Error messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EXPENSE_NOT_EDITABLE: 'Expense cannot be edited in current status',
  EXPENSE_NOT_DELETABLE: 'Expense cannot be deleted in current status',
  APPROVAL_NOT_AUTHORIZED: 'Not authorized to process this approval',
  WORKFLOW_NOT_FOUND: 'No suitable workflow found',
  CURRENCY_CONVERSION_FAILED: 'Currency conversion failed'
};

// Success messages
const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  EXPENSE_SUBMITTED: 'Expense submitted successfully',
  EXPENSE_APPROVED: 'Expense approved successfully',
  EXPENSE_REJECTED: 'Expense rejected successfully',
  NOTIFICATION_READ: 'Notification marked as read',
  PASSWORD_CHANGED: 'Password changed successfully'
};

// API response codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = {
  USER_ROLES,
  EXPENSE_STATUSES,
  APPROVAL_STATUSES,
  APPROVAL_ACTIONS,
  NOTIFICATION_TYPES,
  APPROVER_TYPES,
  RULE_TYPES,
  RULE_ACTIONS,
  DEFAULT_EXPENSE_CATEGORIES,
  FILE_LIMITS,
  PAGINATION,
  DATE_FORMATS,
  COMMON_CURRENCIES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS
};