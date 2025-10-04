const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  validateCreateManager, 
  validateCreateEmployee, 
  validateId, 
  validatePaginationQuery 
} = require('../middleware/validation');

// Apply authentication and admin authorization to all routes
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Manager management
router.get('/managers', validatePaginationQuery, adminController.getManagers);
router.post('/managers', validateCreateManager, adminController.createManager);
router.put('/managers/:id', validateId, adminController.updateManager);
router.delete('/managers/:id', validateId, adminController.deleteManager);

// Employee management
router.get('/employees', validatePaginationQuery, adminController.getEmployees);
router.post('/employees', validateCreateEmployee, adminController.createEmployee);
router.put('/employees/:id', validateId, adminController.updateEmployee);
router.delete('/employees/:id', validateId, adminController.deleteEmployee);

// Expense categories
router.get('/expense-categories', adminController.getExpenseCategories);
router.post('/expense-categories', adminController.createExpenseCategory);

module.exports = router;