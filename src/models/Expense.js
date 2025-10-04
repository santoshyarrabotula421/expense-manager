const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  workflow_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'approval_workflows',
      key: 'id'
    },
    comment: 'Which workflow is being used'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'USD'
  },
  amount_in_company_currency: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Converted amount'
  },
  exchange_rate: {
    type: DataTypes.DECIMAL(10, 6),
    defaultValue: 1.000000
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'expense_categories',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  receipt_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  receipt_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'OCR extracted data'
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'in_approval', 'approved', 'rejected', 'paid'),
    allowNull: false,
    defaultValue: 'draft'
  },
  current_approval_step: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current step in approval workflow'
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejected_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'expenses',
  indexes: [
    {
      name: 'idx_expense_user',
      fields: ['user_id']
    },
    {
      name: 'idx_expense_company',
      fields: ['company_id']
    },
    {
      name: 'idx_expense_status',
      fields: ['status']
    },
    {
      name: 'idx_expense_date',
      fields: ['expense_date']
    },
    {
      name: 'idx_expense_workflow',
      fields: ['workflow_id']
    }
  ]
});

// Instance methods
Expense.prototype.canBeEditedBy = function(user) {
  // Only the creator can edit, and only in draft status
  return this.user_id === user.id && this.status === 'draft';
};

Expense.prototype.canBeDeletedBy = function(user) {
  // Only the creator can delete, and only in draft status
  return this.user_id === user.id && this.status === 'draft';
};

Expense.prototype.canBeSubmittedBy = function(user) {
  // Only the creator can submit, and only in draft status
  return this.user_id === user.id && this.status === 'draft';
};

Expense.prototype.canBeApprovedBy = function(user) {
  // Check if user is in the current approval step
  return this.status === 'in_approval' && user.canApprove();
};

Expense.prototype.isOverBudget = function(budget) {
  return budget && this.amount_in_company_currency > budget;
};

Expense.prototype.requiresReceipt = function() {
  // Expenses over certain amount require receipt
  return this.amount_in_company_currency >= 25.00;
};

Expense.prototype.getStatusColor = function() {
  const colors = {
    'draft': 'gray',
    'submitted': 'blue',
    'in_approval': 'yellow',
    'approved': 'green',
    'rejected': 'red',
    'paid': 'purple'
  };
  return colors[this.status] || 'gray';
};

Expense.prototype.getDaysInStatus = function() {
  const statusDate = this.getStatusDate();
  if (!statusDate) return 0;
  
  const now = new Date();
  const diffTime = Math.abs(now - statusDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Expense.prototype.getStatusDate = function() {
  switch (this.status) {
    case 'submitted':
    case 'in_approval':
      return this.submitted_at;
    case 'approved':
      return this.approved_at;
    case 'rejected':
      return this.rejected_at;
    default:
      return this.updated_at;
  }
};

// Class methods
Expense.getStatusCounts = async function(companyId, userId = null) {
  const whereClause = { company_id: companyId };
  if (userId) {
    whereClause.user_id = userId;
  }
  
  const expenses = await this.findAll({
    where: whereClause,
    attributes: ['status', [sequelize.fn('COUNT', '*'), 'count']],
    group: ['status'],
    raw: true
  });
  
  const statusCounts = {
    draft: 0,
    submitted: 0,
    in_approval: 0,
    approved: 0,
    rejected: 0,
    paid: 0
  };
  
  expenses.forEach(expense => {
    statusCounts[expense.status] = parseInt(expense.count);
  });
  
  return statusCounts;
};

Expense.getTotalAmounts = async function(companyId, userId = null) {
  const whereClause = { company_id: companyId };
  if (userId) {
    whereClause.user_id = userId;
  }
  
  const result = await this.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('SUM', sequelize.col('amount_in_company_currency')), 'total_amount'],
      [sequelize.fn('COUNT', '*'), 'count']
    ],
    group: ['status'],
    raw: true
  });
  
  const totals = {
    draft: { amount: 0, count: 0 },
    submitted: { amount: 0, count: 0 },
    in_approval: { amount: 0, count: 0 },
    approved: { amount: 0, count: 0 },
    rejected: { amount: 0, count: 0 },
    paid: { amount: 0, count: 0 }
  };
  
  result.forEach(row => {
    totals[row.status] = {
      amount: parseFloat(row.total_amount) || 0,
      count: parseInt(row.count) || 0
    };
  });
  
  return totals;
};

module.exports = Expense;