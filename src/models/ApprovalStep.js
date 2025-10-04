const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalStep = sequelize.define('ApprovalStep', {
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
  workflow_step_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'approval_workflow_steps',
      key: 'id'
    },
    comment: 'Reference to the template step'
  },
  step_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  approver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approver_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'manager, finance, cfo, etc.'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'skipped'),
    allowNull: false,
    defaultValue: 'pending'
  },
  comments: {
    type: DataTypes.TEXT,
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
  notified_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'approval_steps',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      name: 'uk_expense_step_approver',
      fields: ['expense_id', 'step_number', 'approver_id']
    },
    {
      name: 'idx_approval_expense',
      fields: ['expense_id']
    },
    {
      name: 'idx_approval_approver',
      fields: ['approver_id']
    },
    {
      name: 'idx_approval_status',
      fields: ['status']
    }
  ]
});

// Instance methods
ApprovalStep.prototype.approve = async function(approverId, comments = null) {
  if (this.approver_id !== approverId) {
    throw new Error('User not authorized to approve this step');
  }
  
  if (this.status !== 'pending') {
    throw new Error('Step is not in pending status');
  }
  
  await this.update({
    status: 'approved',
    comments: comments,
    approved_at: new Date()
  });
  
  return this;
};

ApprovalStep.prototype.reject = async function(approverId, reason) {
  if (this.approver_id !== approverId) {
    throw new Error('User not authorized to reject this step');
  }
  
  if (this.status !== 'pending') {
    throw new Error('Step is not in pending status');
  }
  
  if (!reason || reason.trim().length === 0) {
    throw new Error('Rejection reason is required');
  }
  
  await this.update({
    status: 'rejected',
    comments: reason,
    rejected_at: new Date()
  });
  
  return this;
};

ApprovalStep.prototype.skip = async function(reason = null) {
  if (this.status !== 'pending') {
    throw new Error('Step is not in pending status');
  }
  
  await this.update({
    status: 'skipped',
    comments: reason || 'Step skipped automatically'
  });
  
  return this;
};

ApprovalStep.prototype.canBeProcessedBy = function(userId) {
  return this.approver_id === userId && this.status === 'pending';
};

ApprovalStep.prototype.isOverdue = function(hours = 48) {
  if (this.status !== 'pending') return false;
  
  const now = new Date();
  const createdTime = new Date(this.created_at);
  const diffHours = (now - createdTime) / (1000 * 60 * 60);
  
  return diffHours > hours;
};

ApprovalStep.prototype.getDaysOld = function() {
  const now = new Date();
  const createdTime = new Date(this.created_at);
  const diffTime = Math.abs(now - createdTime);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Class methods
ApprovalStep.getPendingStepsForApprover = async function(approverId, options = {}) {
  const whereClause = {
    approver_id: approverId,
    status: 'pending'
  };
  
  const queryOptions = {
    where: whereClause,
    include: [
      {
        model: require('./Expense'),
        as: 'expense',
        include: [
          { model: require('./User'), as: 'user' },
          { model: require('./ExpenseCategory'), as: 'category' }
        ]
      }
    ],
    order: [['created_at', 'ASC']]
  };
  
  if (options.limit) {
    queryOptions.limit = options.limit;
  }
  
  if (options.offset) {
    queryOptions.offset = options.offset;
  }
  
  return await this.findAll(queryOptions);
};

ApprovalStep.getApprovalStats = async function(approverId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.findAll({
    where: {
      approver_id: approverId,
      created_at: {
        [sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      'status',
      [sequelize.fn('COUNT', '*'), 'count'],
      [sequelize.fn('AVG', 
        sequelize.fn('TIMESTAMPDIFF', 
          sequelize.literal('HOUR'), 
          sequelize.col('created_at'), 
          sequelize.fn('COALESCE', 
            sequelize.col('approved_at'), 
            sequelize.col('rejected_at'),
            sequelize.fn('NOW')
          )
        )
      ), 'avg_hours']
    ],
    group: ['status'],
    raw: true
  });
  
  return stats.reduce((acc, stat) => {
    acc[stat.status] = {
      count: parseInt(stat.count),
      avg_hours: parseFloat(stat.avg_hours) || 0
    };
    return acc;
  }, {});
};

module.exports = ApprovalStep;