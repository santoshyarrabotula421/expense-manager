const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalHistory = sequelize.define('ApprovalHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  expense_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'expenses',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Who performed the action'
  },
  action: {
    type: DataTypes.ENUM('submitted', 'approved', 'rejected', 'assigned', 'reassigned', 'escalated', 'auto_approved'),
    allowNull: false
  },
  step_number: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  previous_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  new_status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context data'
  }
}, {
  tableName: 'approval_history',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_history_expense',
      fields: ['expense_id']
    },
    {
      name: 'idx_history_user',
      fields: ['user_id']
    },
    {
      name: 'idx_history_action',
      fields: ['action']
    }
  ]
});

// Instance methods
ApprovalHistory.prototype.getActionDescription = function() {
  const descriptions = {
    'submitted': 'Expense submitted for approval',
    'approved': 'Expense approved',
    'rejected': 'Expense rejected',
    'assigned': 'Assigned to approver',
    'reassigned': 'Reassigned to different approver',
    'escalated': 'Escalated to higher authority',
    'auto_approved': 'Automatically approved'
  };
  
  return descriptions[this.action] || this.action;
};

ApprovalHistory.prototype.getActionIcon = function() {
  const icons = {
    'submitted': '📝',
    'approved': '✅',
    'rejected': '❌',
    'assigned': '👤',
    'reassigned': '🔄',
    'escalated': '⬆️',
    'auto_approved': '🤖'
  };
  
  return icons[this.action] || '📋';
};

ApprovalHistory.prototype.getTimeSinceAction = function() {
  const now = new Date();
  const actionTime = new Date(this.created_at);
  const diffTime = Math.abs(now - actionTime);
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
  
  if (diffDays > 1) {
    return `${diffDays} days ago`;
  } else if (diffHours > 1) {
    return `${diffHours} hours ago`;
  } else {
    return `${diffMinutes} minutes ago`;
  }
};

// Class methods
ApprovalHistory.createEntry = async function(expenseId, userId, action, options = {}) {
  const entry = {
    expense_id: expenseId,
    user_id: userId,
    action: action,
    step_number: options.stepNumber || null,
    previous_status: options.previousStatus || null,
    new_status: options.newStatus || action,
    comments: options.comments || null,
    metadata: options.metadata || null
  };
  
  return await this.create(entry);
};

ApprovalHistory.getExpenseTimeline = async function(expenseId) {
  return await this.findAll({
    where: { expense_id: expenseId },
    include: [
      {
        model: require('./User'),
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }
    ],
    order: [['created_at', 'ASC']]
  });
};

ApprovalHistory.getUserActivity = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.findAll({
    where: {
      user_id: userId,
      created_at: {
        [sequelize.Op.gte]: startDate
      }
    },
    include: [
      {
        model: require('./Expense'),
        as: 'expense',
        attributes: ['id', 'amount', 'description', 'status'],
        include: [
          {
            model: require('./User'),
            as: 'user',
            attributes: ['name', 'email']
          }
        ]
      }
    ],
    order: [['created_at', 'DESC']]
  });
};

ApprovalHistory.getApprovalMetrics = async function(companyId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const metrics = await this.findAll({
    where: {
      created_at: {
        [sequelize.Op.gte]: startDate
      }
    },
    include: [
      {
        model: require('./Expense'),
        as: 'expense',
        where: { company_id: companyId },
        attributes: []
      }
    ],
    attributes: [
      'action',
      [sequelize.fn('COUNT', '*'), 'count'],
      [sequelize.fn('DATE', sequelize.col('ApprovalHistory.created_at')), 'date']
    ],
    group: ['action', sequelize.fn('DATE', sequelize.col('ApprovalHistory.created_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('ApprovalHistory.created_at')), 'ASC']],
    raw: true
  });
  
  return metrics;
};

module.exports = ApprovalHistory;