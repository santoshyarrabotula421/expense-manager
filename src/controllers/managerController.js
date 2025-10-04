const { 
  User, 
  Expense, 
  ApprovalStep, 
  ApprovalHistory,
  ExpenseCategory,
  Notification
} = require('../models');
const { Op } = require('sequelize');
const approvalWorkflowService = require('../services/approvalWorkflowService');

// Dashboard
const getDashboard = async (req, res) => {
  try {
    const managerId = req.user.id;
    const companyId = req.user.company_id;
    
    // Get pending approvals for this manager
    const pendingApprovals = await ApprovalStep.count({
      where: { 
        approver_id: managerId, 
        status: 'pending' 
      }
    });
    
    // Get approval statistics for the last 30 days
    const approvalStats = await approvalWorkflowService.getApprovalStatsForUser(managerId, 30);
    
    // Get team expense statistics (employees under this manager)
    const teamExpenseStats = await Expense.findAll({
      include: [{
        model: User,
        as: 'user',
        where: { manager_id: managerId },
        attributes: []
      }],
      attributes: [
        'status',
        [Expense.sequelize.fn('COUNT', '*'), 'count'],
        [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'total_amount']
      ],
      group: ['status'],
      raw: true
    });
    
    const teamStats = teamExpenseStats.reduce((acc, item) => {
      acc[item.status] = {
        count: parseInt(item.count),
        total_amount: parseFloat(item.total_amount) || 0
      };
      return acc;
    }, {});
    
    // Get recent team expenses
    const recentTeamExpenses = await Expense.findAll({
      include: [
        {
          model: User,
          as: 'user',
          where: { manager_id: managerId },
          attributes: ['name', 'email', 'employee_id']
        },
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    // Get overdue approvals
    const overdueApprovals = await ApprovalStep.findAll({
      where: {
        approver_id: managerId,
        status: 'pending',
        created_at: {
          [Op.lt]: new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
        }
      },
      include: [{
        model: Expense,
        as: 'expense',
        include: [
          { model: User, as: 'user', attributes: ['name', 'email'] },
          { model: ExpenseCategory, as: 'category', attributes: ['name'] }
        ]
      }],
      order: [['created_at', 'ASC']]
    });
    
    res.json({
      pending_approvals: pendingApprovals,
      approval_stats: approvalStats,
      team_expense_stats: teamStats,
      recent_team_expenses: recentTeamExpenses,
      overdue_approvals: overdueApprovals
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// Get pending approvals
const getPendingApprovals = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { page = 1, limit = 20, sort_by = 'created_at', sort_order = 'ASC' } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const pendingApprovals = await ApprovalStep.findAndCountAll({
      where: {
        approver_id: managerId,
        status: 'pending'
      },
      include: [{
        model: Expense,
        as: 'expense',
        include: [
          { 
            model: User, 
            as: 'user', 
            attributes: ['id', 'name', 'email', 'employee_id', 'department'] 
          },
          { 
            model: ExpenseCategory, 
            as: 'category', 
            attributes: ['name'] 
          }
        ]
      }],
      limit: parseInt(limit),
      offset: offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      distinct: true
    });
    
    // Add additional metadata to each approval
    const approvals = pendingApprovals.rows.map(approval => {
      const daysOld = approval.getDaysOld();
      const isOverdue = approval.isOverdue(48); // 48 hours
      
      return {
        ...approval.toJSON(),
        days_old: daysOld,
        is_overdue: isOverdue,
        priority: isOverdue ? 'high' : (daysOld > 1 ? 'medium' : 'normal')
      };
    });
    
    res.json({
      approvals,
      pagination: {
        total: pendingApprovals.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(pendingApprovals.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
};

// Get approval details
const getApprovalDetails = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { id } = req.params;
    
    const approval = await ApprovalStep.findOne({
      where: {
        id: id,
        approver_id: managerId
      },
      include: [{
        model: Expense,
        as: 'expense',
        include: [
          { 
            model: User, 
            as: 'user', 
            attributes: ['id', 'name', 'email', 'employee_id', 'department', 'manager_id'],
            include: [{ model: User, as: 'manager', attributes: ['name', 'email'] }]
          },
          { model: ExpenseCategory, as: 'category' }
        ]
      }]
    });
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    // Get approval history for this expense
    const approvalHistory = await ApprovalHistory.getExpenseTimeline(approval.expense.id);
    
    // Get other approval steps for this expense
    const allApprovalSteps = await ApprovalStep.findAll({
      where: { expense_id: approval.expense.id },
      include: [{ model: User, as: 'approver', attributes: ['name', 'email', 'role'] }],
      order: [['step_number', 'ASC']]
    });
    
    res.json({
      approval: {
        ...approval.toJSON(),
        days_old: approval.getDaysOld(),
        is_overdue: approval.isOverdue(48)
      },
      approval_history: approvalHistory,
      all_approval_steps: allApprovalSteps
    });
  } catch (error) {
    console.error('Get approval details error:', error);
    res.status(500).json({ error: 'Failed to fetch approval details' });
  }
};

// Process approval (approve/reject)
const processApproval = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { id } = req.params;
    const { action, comments } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
    }
    
    if (action === 'reject' && (!comments || comments.trim().length === 0)) {
      return res.status(400).json({ error: 'Comments are required when rejecting' });
    }
    
    const result = await approvalWorkflowService.processApproval(
      id, 
      managerId, 
      action, 
      comments
    );
    
    res.json({
      message: `Expense ${action}d successfully`,
      approval_step: result.approvalStep,
      expense: result.expense
    });
  } catch (error) {
    console.error('Process approval error:', error);
    
    if (error.message.includes('not authorized') || error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to process approval' });
  }
};

// Get approval history
const getApprovalHistory = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      action, 
      start_date, 
      end_date,
      user_id 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereClause = { user_id: managerId };
    
    if (action && ['approved', 'rejected'].includes(action)) {
      whereClause.action = action;
    }
    
    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    
    // If filtering by user (employee), ensure they are under this manager
    let includeWhere = {};
    if (user_id) {
      const employee = await User.findOne({
        where: { id: user_id, manager_id: managerId }
      });
      
      if (!employee) {
        return res.status(403).json({ error: 'Access denied to this employee\'s data' });
      }
      
      includeWhere.user_id = user_id;
    } else {
      // Only show expenses from employees under this manager
      const teamMembers = await User.findAll({
        where: { manager_id: managerId },
        attributes: ['id']
      });
      
      const teamMemberIds = teamMembers.map(member => member.id);
      if (teamMemberIds.length > 0) {
        includeWhere.user_id = { [Op.in]: teamMemberIds };
      } else {
        // Manager has no team members
        return res.json({
          history: [],
          pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 }
        });
      }
    }
    
    const { count, rows: history } = await ApprovalHistory.findAndCountAll({
      where: whereClause,
      include: [{
        model: Expense,
        as: 'expense',
        where: includeWhere,
        include: [
          { model: User, as: 'user', attributes: ['name', 'email', 'employee_id'] },
          { model: ExpenseCategory, as: 'category', attributes: ['name'] }
        ]
      }],
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']],
      distinct: true
    });
    
    res.json({
      history,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({ error: 'Failed to fetch approval history' });
  }
};

// Get team members
const getTeamMembers = async (req, res) => {
  try {
    const managerId = req.user.id;
    
    const teamMembers = await User.findAll({
      where: { 
        manager_id: managerId,
        is_active: true
      },
      attributes: ['id', 'name', 'email', 'employee_id', 'department', 'created_at'],
      order: [['name', 'ASC']]
    });
    
    // Get expense statistics for each team member
    const teamWithStats = await Promise.all(
      teamMembers.map(async (member) => {
        const expenseStats = await Expense.findAll({
          where: { user_id: member.id },
          attributes: [
            'status',
            [Expense.sequelize.fn('COUNT', '*'), 'count'],
            [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'total_amount']
          ],
          group: ['status'],
          raw: true
        });
        
        const stats = expenseStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: parseInt(stat.count),
            total_amount: parseFloat(stat.total_amount) || 0
          };
          return acc;
        }, {});
        
        return {
          ...member.toJSON(),
          expense_stats: stats
        };
      })
    );
    
    res.json({ team_members: teamWithStats });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

// Get team expenses
const getTeamExpenses = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      user_id, 
      start_date, 
      end_date,
      category_id 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause for expenses
    const expenseWhere = {};
    
    if (status) expenseWhere.status = status;
    if (category_id) expenseWhere.category_id = category_id;
    
    if (start_date && end_date) {
      expenseWhere.expense_date = {
        [Op.between]: [start_date, end_date]
      };
    }
    
    // Build where clause for users (team members)
    const userWhere = { manager_id: managerId };
    if (user_id) userWhere.id = user_id;
    
    const { count, rows: expenses } = await Expense.findAndCountAll({
      where: expenseWhere,
      include: [
        {
          model: User,
          as: 'user',
          where: userWhere,
          attributes: ['id', 'name', 'email', 'employee_id']
        },
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['name']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']],
      distinct: true
    });
    
    res.json({
      expenses,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get team expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch team expenses' });
  }
};

// Get manager statistics
const getManagerStats = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    
    // Approval performance stats
    const approvalStats = await approvalWorkflowService.getApprovalStatsForUser(managerId, parseInt(days));
    
    // Team performance stats
    const teamStats = await Expense.findAll({
      where: {
        created_at: { [Op.gte]: startDate }
      },
      include: [{
        model: User,
        as: 'user',
        where: { manager_id: managerId },
        attributes: []
      }],
      attributes: [
        [Expense.sequelize.fn('COUNT', '*'), 'total_expenses'],
        [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount_in_company_currency')), 'total_amount'],
        [Expense.sequelize.fn('AVG', Expense.sequelize.col('amount_in_company_currency')), 'avg_amount']
      ],
      raw: true
    });
    
    // Response time analysis
    const responseTimeStats = await ApprovalStep.findAll({
      where: {
        approver_id: managerId,
        status: { [Op.in]: ['approved', 'rejected'] },
        created_at: { [Op.gte]: startDate }
      },
      attributes: [
        [Expense.sequelize.fn('AVG', 
          Expense.sequelize.fn('TIMESTAMPDIFF', 
            Expense.sequelize.literal('HOUR'), 
            Expense.sequelize.col('created_at'), 
            Expense.sequelize.fn('COALESCE', 
              Expense.sequelize.col('approved_at'), 
              Expense.sequelize.col('rejected_at')
            )
          )
        ), 'avg_response_hours']
      ],
      raw: true
    });
    
    res.json({
      approval_stats: approvalStats,
      team_stats: teamStats[0] || { total_expenses: 0, total_amount: 0, avg_amount: 0 },
      avg_response_hours: responseTimeStats[0]?.avg_response_hours || 0,
      period_days: parseInt(days)
    });
  } catch (error) {
    console.error('Get manager stats error:', error);
    res.status(500).json({ error: 'Failed to fetch manager statistics' });
  }
};

module.exports = {
  getDashboard,
  getPendingApprovals,
  getApprovalDetails,
  processApproval,
  getApprovalHistory,
  getTeamMembers,
  getTeamExpenses,
  getManagerStats
};