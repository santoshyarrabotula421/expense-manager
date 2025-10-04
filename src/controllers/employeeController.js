const { 
  User, 
  Expense, 
  ExpenseCategory, 
  ApprovalStep, 
  ApprovalHistory,
  Notification
} = require('../models');
const { Op } = require('sequelize');
const currencyService = require('../services/currencyService');
const approvalWorkflowService = require('../services/approvalWorkflowService');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/receipts/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: ' + allowedTypes.join(', ')));
    }
  }
});

// Dashboard
const getDashboard = async (req, res) => {
  try {
    const employeeId = req.user.id;
    
    // Get expense statistics
    const expenseStats = await Expense.getTotalAmounts(null, employeeId);
    const statusCounts = await Expense.getStatusCounts(null, employeeId);
    
    // Get recent expenses
    const recentExpenses = await Expense.findAll({
      where: { user_id: employeeId },
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    // Get pending approvals for user's expenses
    const pendingApprovals = await ApprovalStep.findAll({
      where: { status: 'pending' },
      include: [{
        model: Expense,
        as: 'expense',
        where: { user_id: employeeId },
        include: [
          { model: ExpenseCategory, as: 'category', attributes: ['name'] }
        ]
      }, {
        model: User,
        as: 'approver',
        attributes: ['name', 'email', 'role']
      }],
      order: [['created_at', 'ASC']]
    });
    
    // Get notifications
    const notifications = await Notification.getUserNotifications(employeeId, {
      unreadOnly: false,
      limit: 5
    });
    
    // Calculate monthly expense totals for the last 6 months
    const monthlyExpenses = await Expense.findAll({
      where: {
        user_id: employeeId,
        expense_date: {
          [Op.gte]: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 months ago
        }
      },
      attributes: [
        [Expense.sequelize.fn('DATE_FORMAT', Expense.sequelize.col('expense_date'), '%Y-%m'), 'month'],
        [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'total_amount'],
        [Expense.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: [Expense.sequelize.fn('DATE_FORMAT', Expense.sequelize.col('expense_date'), '%Y-%m')],
      order: [[Expense.sequelize.fn('DATE_FORMAT', Expense.sequelize.col('expense_date'), '%Y-%m'), 'ASC']],
      raw: true
    });
    
    res.json({
      expense_stats: expenseStats,
      status_counts: statusCounts,
      recent_expenses: recentExpenses,
      pending_approvals: pendingApprovals,
      notifications: notifications,
      monthly_expenses: monthlyExpenses
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// Get all expenses for employee
const getExpenses = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category_id, 
      start_date, 
      end_date,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereClause = { user_id: employeeId };
    
    if (status) whereClause.status = status;
    if (category_id) whereClause.category_id = category_id;
    
    if (start_date && end_date) {
      whereClause.expense_date = {
        [Op.between]: [start_date, end_date]
      };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { remarks: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows: expenses } = await Expense.findAndCountAll({
      where: whereClause,
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['name'] }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      distinct: true
    });
    
    // Add additional metadata to each expense
    const expensesWithMeta = expenses.map(expense => ({
      ...expense.toJSON(),
      days_since_submission: expense.submitted_at ? 
        Math.ceil((new Date() - new Date(expense.submitted_at)) / (1000 * 60 * 60 * 24)) : null,
      can_edit: expense.canBeEditedBy(req.user),
      can_delete: expense.canBeDeletedBy(req.user),
      can_submit: expense.canBeSubmittedBy(req.user)
    }));
    
    res.json({
      expenses: expensesWithMeta,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// Get specific expense details
const getExpenseDetails = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { id } = req.params;
    
    const expense = await Expense.findOne({
      where: { id, user_id: employeeId },
      include: [
        { model: ExpenseCategory, as: 'category' },
        { 
          model: ApprovalStep, 
          as: 'approval_steps',
          include: [{ model: User, as: 'approver', attributes: ['name', 'email', 'role'] }],
          order: [['step_number', 'ASC']]
        }
      ]
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    // Get approval history
    const approvalHistory = await ApprovalHistory.getExpenseTimeline(expense.id);
    
    res.json({
      expense: {
        ...expense.toJSON(),
        can_edit: expense.canBeEditedBy(req.user),
        can_delete: expense.canBeDeletedBy(req.user),
        can_submit: expense.canBeSubmittedBy(req.user)
      },
      approval_history: approvalHistory
    });
  } catch (error) {
    console.error('Get expense details error:', error);
    res.status(500).json({ error: 'Failed to fetch expense details' });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const companyId = req.user.company_id;
    
    const {
      description,
      expense_date,
      category_id,
      amount,
      currency = 'USD',
      location,
      remarks,
      status = 'draft'
    } = req.body;
    
    // Convert amount to company currency
    const company = await req.user.company;
    const companyCurrency = company?.currency || 'USD';
    
    let amountInCompanyCurrency = amount;
    let exchangeRate = 1.0;
    
    if (currency !== companyCurrency) {
      try {
        amountInCompanyCurrency = await currencyService.convertCurrency(
          parseFloat(amount), 
          currency, 
          companyCurrency
        );
        
        const rates = await currencyService.getExchangeRates(currency);
        exchangeRate = rates.rates[companyCurrency] || 1.0;
      } catch (conversionError) {
        console.warn('Currency conversion failed, using original amount:', conversionError);
      }
    }
    
    // Handle file upload if present
    let receiptUrl = null;
    if (req.file) {
      receiptUrl = `/uploads/receipts/${req.file.filename}`;
    }
    
    const expense = await Expense.create({
      user_id: employeeId,
      company_id: companyId,
      description,
      expense_date,
      category_id,
      amount: parseFloat(amount),
      currency,
      amount_in_company_currency: amountInCompanyCurrency,
      exchange_rate: exchangeRate,
      location,
      remarks,
      receipt_url: receiptUrl,
      status
    });
    
    // If status is 'submitted', initialize approval workflow
    if (status === 'submitted') {
      try {
        await approvalWorkflowService.initializeWorkflow(expense);
      } catch (workflowError) {
        console.error('Workflow initialization error:', workflowError);
        // Don't fail the expense creation, but log the error
      }
    }
    
    const completeExpense = await Expense.findByPk(expense.id, {
      include: [{ model: ExpenseCategory, as: 'category' }]
    });
    
    res.status(201).json({
      message: 'Expense created successfully',
      expense: completeExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { id } = req.params;
    
    const expense = await Expense.findOne({
      where: { id, user_id: employeeId }
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    if (!expense.canBeEditedBy(req.user)) {
      return res.status(403).json({ error: 'Expense cannot be edited in current status' });
    }
    
    const updateData = req.body;
    
    // Handle currency conversion if amount or currency changed
    if (updateData.amount || updateData.currency) {
      const company = await req.user.company;
      const companyCurrency = company?.currency || 'USD';
      const newCurrency = updateData.currency || expense.currency;
      const newAmount = updateData.amount || expense.amount;
      
      if (newCurrency !== companyCurrency) {
        try {
          updateData.amount_in_company_currency = await currencyService.convertCurrency(
            parseFloat(newAmount), 
            newCurrency, 
            companyCurrency
          );
          
          const rates = await currencyService.getExchangeRates(newCurrency);
          updateData.exchange_rate = rates.rates[companyCurrency] || 1.0;
        } catch (conversionError) {
          console.warn('Currency conversion failed:', conversionError);
        }
      } else {
        updateData.amount_in_company_currency = newAmount;
        updateData.exchange_rate = 1.0;
      }
    }
    
    // Handle file upload if present
    if (req.file) {
      updateData.receipt_url = `/uploads/receipts/${req.file.filename}`;
    }
    
    await expense.update(updateData);
    
    // If status changed to 'submitted', initialize approval workflow
    if (updateData.status === 'submitted' && expense.status === 'draft') {
      try {
        await approvalWorkflowService.initializeWorkflow(expense);
      } catch (workflowError) {
        console.error('Workflow initialization error:', workflowError);
      }
    }
    
    const updatedExpense = await Expense.findByPk(expense.id, {
      include: [{ model: ExpenseCategory, as: 'category' }]
    });
    
    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { id } = req.params;
    
    const expense = await Expense.findOne({
      where: { id, user_id: employeeId }
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    if (!expense.canBeDeletedBy(req.user)) {
      return res.status(403).json({ error: 'Expense cannot be deleted in current status' });
    }
    
    await expense.destroy();
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// Submit expense for approval
const submitExpense = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { id } = req.params;
    
    const expense = await Expense.findOne({
      where: { id, user_id: employeeId }
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    if (!expense.canBeSubmittedBy(req.user)) {
      return res.status(403).json({ error: 'Expense cannot be submitted in current status' });
    }
    
    // Initialize approval workflow
    const workflowResult = await approvalWorkflowService.initializeWorkflow(expense);
    
    const updatedExpense = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { 
          model: ApprovalStep, 
          as: 'approval_steps',
          include: [{ model: User, as: 'approver', attributes: ['name', 'email'] }]
        }
      ]
    });
    
    res.json({
      message: 'Expense submitted successfully',
      expense: updatedExpense,
      workflow: workflowResult.workflow,
      next_approver: workflowResult.nextApprover
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({ error: 'Failed to submit expense' });
  }
};

// Get expense categories
const getExpenseCategories = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    
    const categories = await ExpenseCategory.findAll({
      where: { 
        company_id: companyId,
        is_active: true
      },
      order: [['name', 'ASC']]
    });
    
    res.json({ categories });
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
};

// Get supported currencies
const getSupportedCurrencies = async (req, res) => {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    res.json({ currencies });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ error: 'Failed to fetch supported currencies' });
  }
};

// Get notifications
const getNotifications = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { unread_only = false, page = 1, limit = 20 } = req.query;
    
    const notifications = await Notification.getUserNotifications(employeeId, {
      unreadOnly: unread_only === 'true',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    const unreadCount = await Notification.getUnreadCount(employeeId);
    
    res.json({
      notifications,
      unread_count: unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      where: { id, user_id: employeeId }
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.markAsRead();
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
  try {
    const employeeId = req.user.id;
    
    await Notification.markAllAsRead(employeeId);
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

module.exports = {
  upload,
  getDashboard,
  getExpenses,
  getExpenseDetails,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  getExpenseCategories,
  getSupportedCurrencies,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};