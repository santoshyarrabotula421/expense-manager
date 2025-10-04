const { 
  Company, 
  User, 
  ExpenseCategory, 
  ApprovalWorkflow,
  ApprovalWorkflowStep,
  ApprovalRule,
  Expense,
  ApprovalStep,
  ApprovalHistory
} = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Dashboard
const getDashboard = async (req, res) => {
  try {
    const companyId = req.user.id; // Admin's company ID is their user ID
    
    // Get expense statistics
    const expenseStats = await Expense.getTotalAmounts(companyId);
    const statusCounts = await Expense.getStatusCounts(companyId);
    
    // Get user counts
    const userCounts = await User.findAll({
      where: { company_id: companyId },
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['role'],
      raw: true
    });
    
    const userStats = userCounts.reduce((acc, item) => {
      acc[item.role] = parseInt(item.count);
      return acc;
    }, { admin: 0, manager: 0, employee: 0 });

    // Get recent expenses
    const recentExpenses = await Expense.findAll({
      where: { company_id: companyId },
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: ExpenseCategory, as: 'category', attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Get pending approvals count
    const pendingApprovals = await ApprovalStep.count({
      where: { status: 'pending' },
      include: [{
        model: Expense,
        as: 'expense',
        where: { company_id: companyId },
        attributes: []
      }]
    });

    res.json({
      expense_stats: expenseStats,
      status_counts: statusCounts,
      user_stats: userStats,
      recent_expenses: recentExpenses,
      pending_approvals: pendingApprovals
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// User Management
const getUsers = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { role, page = 1, limit = 20, search } = req.query;
    
    const whereClause = { company_id: companyId };
    
    if (role && ['admin', 'manager', 'employee'].includes(role)) {
      whereClause.role = role;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { employee_id: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const createUser = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { 
      name, 
      email, 
      password, 
      role, 
      manager_id, 
      department, 
      employee_id,
      is_manager_approver 
    } = req.body;
    
    // Check if email already exists in the company
    const existingUser = await User.findOne({
      where: { email, company_id: companyId }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists in this company' });
    }
    
    // Validate manager_id if provided
    if (manager_id) {
      const manager = await User.findOne({
        where: { 
          id: manager_id, 
          company_id: companyId,
          role: { [Op.in]: ['admin', 'manager'] }
        }
      });
      
      if (!manager) {
        return res.status(400).json({ error: 'Invalid manager ID' });
      }
    }
    
    const user = await User.create({
      company_id: companyId,
      name,
      email,
      password_hash: password, // Will be hashed by the model hook
      role: role || 'employee',
      manager_id,
      department,
      employee_id,
      is_manager_approver: is_manager_approver || false
    });
    
    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await User.findOne({
      where: { id, company_id: companyId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive fields that shouldn't be updated this way
    delete updateData.password_hash;
    delete updateData.company_id;
    
    // Validate manager_id if being updated
    if (updateData.manager_id) {
      const manager = await User.findOne({
        where: { 
          id: updateData.manager_id, 
          company_id: companyId,
          role: { [Op.in]: ['admin', 'manager'] }
        }
      });
      
      if (!manager) {
        return res.status(400).json({ error: 'Invalid manager ID' });
      }
    }
    
    await user.update(updateData);
    
    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    
    const user = await User.findOne({
      where: { id, company_id: companyId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has pending expenses or approvals
    const pendingExpenses = await Expense.count({
      where: { 
        user_id: id, 
        status: { [Op.in]: ['submitted', 'in_approval'] }
      }
    });
    
    const pendingApprovals = await ApprovalStep.count({
      where: { 
        approver_id: id, 
        status: 'pending' 
      }
    });
    
    if (pendingExpenses > 0 || pendingApprovals > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with pending expenses or approvals',
        pending_expenses: pendingExpenses,
        pending_approvals: pendingApprovals
      });
    }
    
    // Soft delete by deactivating
    await user.update({ is_active: false });
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Expense Category Management
const getExpenseCategories = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    const categories = await ExpenseCategory.findAll({
      where: { company_id: companyId },
      order: [['name', 'ASC']]
    });
    
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
};

const createExpenseCategory = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { name, description } = req.body;
    
    const category = await ExpenseCategory.create({
      company_id: companyId,
      name,
      description
    });
    
    res.status(201).json({
      message: 'Expense category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create expense category' });
  }
};

const updateExpenseCategory = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    const category = await ExpenseCategory.findOne({
      where: { id, company_id: companyId }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Expense category not found' });
    }
    
    await category.update({ name, description, is_active });
    
    res.json({
      message: 'Expense category updated successfully',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update expense category' });
  }
};

// Approval Workflow Management
const getApprovalWorkflows = async (req, res) => {
  try {
    const companyId = req.user.id;
    
    const workflows = await ApprovalWorkflow.findAll({
      where: { company_id: companyId },
      include: [{
        model: ApprovalWorkflowStep,
        as: 'steps',
        include: [{ model: User, as: 'approver', attributes: ['id', 'name', 'email'] }]
      }],
      order: [['created_at', 'DESC'], ['steps', 'step_number', 'ASC']]
    });
    
    res.json({ workflows });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch approval workflows' });
  }
};

const createApprovalWorkflow = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { name, description, is_default, steps } = req.body;
    
    // If this is set as default, unset other defaults
    if (is_default) {
      await ApprovalWorkflow.update(
        { is_default: false },
        { where: { company_id: companyId } }
      );
    }
    
    const workflow = await ApprovalWorkflow.create({
      company_id: companyId,
      name,
      description,
      is_default: is_default || false
    });
    
    // Create workflow steps
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await ApprovalWorkflowStep.create({
          workflow_id: workflow.id,
          step_number: step.step_number,
          step_name: step.step_name,
          approver_type: step.approver_type,
          approver_id: step.approver_id,
          approver_role: step.approver_role,
          is_required: step.is_required !== false,
          condition_amount_min: step.condition_amount_min || 0,
          condition_amount_max: step.condition_amount_max,
          condition_category_ids: step.condition_category_ids,
          auto_approve_threshold: step.auto_approve_threshold
        });
      }
    }
    
    // Fetch the complete workflow with steps
    const completeWorkflow = await ApprovalWorkflow.findByPk(workflow.id, {
      include: [{
        model: ApprovalWorkflowStep,
        as: 'steps',
        include: [{ model: User, as: 'approver', attributes: ['id', 'name', 'email'] }]
      }]
    });
    
    res.status(201).json({
      message: 'Approval workflow created successfully',
      workflow: completeWorkflow
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Failed to create approval workflow' });
  }
};

// Company Settings
const getCompanySettings = async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({ company });
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
};

const updateCompanySettings = async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const { name, country, currency, timezone } = req.body;
    
    await company.update({
      name: name || company.name,
      country: country || company.country,
      currency: currency || company.currency,
      timezone: timezone || company.timezone
    });
    
    res.json({
      message: 'Company settings updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ error: 'Failed to update company settings' });
  }
};

// Reports
const getExpenseReports = async (req, res) => {
  try {
    const companyId = req.user.id;
    const { 
      start_date, 
      end_date, 
      user_id, 
      category_id, 
      status,
      group_by = 'month'
    } = req.query;
    
    const whereClause = { company_id: companyId };
    
    if (start_date && end_date) {
      whereClause.expense_date = {
        [Op.between]: [start_date, end_date]
      };
    }
    
    if (user_id) whereClause.user_id = user_id;
    if (category_id) whereClause.category_id = category_id;
    if (status) whereClause.status = status;
    
    // Group by time period
    let dateFormat;
    switch (group_by) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }
    
    const reports = await Expense.findAll({
      where: whereClause,
      attributes: [
        [Expense.sequelize.fn('DATE_FORMAT', Expense.sequelize.col('expense_date'), dateFormat), 'period'],
        [Expense.sequelize.fn('COUNT', '*'), 'count'],
        [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'total_amount'],
        [Expense.sequelize.fn('AVG', Expense.sequelize.col('amount_in_company_currency')), 'avg_amount']
      ],
      group: [Expense.sequelize.fn('DATE_FORMAT', Expense.sequelize.col('expense_date'), dateFormat)],
      order: [[Expense.sequelize.fn('DATE_FORMAT', Expense.sequelize.col('expense_date'), dateFormat), 'ASC']],
      raw: true
    });
    
    res.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch expense reports' });
  }
};

module.exports = {
  getDashboard,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  getApprovalWorkflows,
  createApprovalWorkflow,
  getCompanySettings,
  updateCompanySettings,
  getExpenseReports
};