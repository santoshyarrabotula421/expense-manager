const { sequelize } = require('../config/database');

// Import all models
const Company = require('./Company');
const User = require('./User');
const ExpenseCategory = require('./ExpenseCategory');
const ApprovalWorkflow = require('./ApprovalWorkflow');
const ApprovalWorkflowStep = require('./ApprovalWorkflowStep');
const ApprovalRule = require('./ApprovalRule');
const Expense = require('./Expense');
const ApprovalStep = require('./ApprovalStep');
const ApprovalHistory = require('./ApprovalHistory');
const Notification = require('./Notification');

// Define associations

// Company associations
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
Company.hasMany(ExpenseCategory, { foreignKey: 'company_id', as: 'expense_categories' });
Company.hasMany(ApprovalWorkflow, { foreignKey: 'company_id', as: 'approval_workflows' });
Company.hasMany(ApprovalRule, { foreignKey: 'company_id', as: 'approval_rules' });
Company.hasMany(Expense, { foreignKey: 'company_id', as: 'expenses' });

// User associations
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
User.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });
User.hasMany(User, { foreignKey: 'manager_id', as: 'direct_reports' });
User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });
User.hasMany(ApprovalStep, { foreignKey: 'approver_id', as: 'approval_steps' });
User.hasMany(ApprovalHistory, { foreignKey: 'user_id', as: 'approval_history' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// ExpenseCategory associations
ExpenseCategory.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });

// ApprovalWorkflow associations
ApprovalWorkflow.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
ApprovalWorkflow.hasMany(ApprovalWorkflowStep, { foreignKey: 'workflow_id', as: 'steps' });
ApprovalWorkflow.hasMany(ApprovalRule, { foreignKey: 'workflow_id', as: 'rules' });
ApprovalWorkflow.hasMany(Expense, { foreignKey: 'workflow_id', as: 'expenses' });

// ApprovalWorkflowStep associations
ApprovalWorkflowStep.belongsTo(ApprovalWorkflow, { foreignKey: 'workflow_id', as: 'workflow' });
ApprovalWorkflowStep.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });
ApprovalWorkflowStep.hasMany(ApprovalStep, { foreignKey: 'workflow_step_id', as: 'approval_steps' });

// ApprovalRule associations
ApprovalRule.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
ApprovalRule.belongsTo(ApprovalWorkflow, { foreignKey: 'workflow_id', as: 'workflow' });
ApprovalRule.belongsTo(User, { foreignKey: 'specific_approver_id', as: 'specific_approver' });

// Expense associations
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Expense.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Expense.belongsTo(ApprovalWorkflow, { foreignKey: 'workflow_id', as: 'workflow' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });
Expense.hasMany(ApprovalStep, { foreignKey: 'expense_id', as: 'approval_steps' });
Expense.hasMany(ApprovalHistory, { foreignKey: 'expense_id', as: 'approval_history' });
Expense.hasMany(Notification, { foreignKey: 'expense_id', as: 'notifications' });

// ApprovalStep associations
ApprovalStep.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });
ApprovalStep.belongsTo(ApprovalWorkflowStep, { foreignKey: 'workflow_step_id', as: 'workflow_step' });
ApprovalStep.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });

// ApprovalHistory associations
ApprovalHistory.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });
ApprovalHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });

// Export all models
module.exports = {
  sequelize,
  Company,
  User,
  ExpenseCategory,
  ApprovalWorkflow,
  ApprovalWorkflowStep,
  ApprovalRule,
  Expense,
  ApprovalStep,
  ApprovalHistory,
  Notification
};