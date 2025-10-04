const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  validateExpenseRequest, 
  validateId, 
  validatePaginationQuery,
  validateExpenseFilters 
} = require('../middleware/validation');

// Apply authentication and employee authorization to all routes
router.use(authenticateToken);
router.use(authorizeRoles('employee'));

// Dashboard
router.get('/dashboard', employeeController.getDashboard);

// Expense management
router.get('/expenses', validatePaginationQuery, validateExpenseFilters, employeeController.getExpenses);
router.post('/expenses', validateExpenseRequest, employeeController.createExpense);
router.get('/expenses/:id', validateId, employeeController.getExpenseById);
router.put('/expenses/:id', validateId, employeeController.updateExpense);
router.delete('/expenses/:id', validateId, employeeController.deleteExpense);
router.post('/expenses/:id/submit', validateId, employeeController.submitExpense);

module.exports = router;