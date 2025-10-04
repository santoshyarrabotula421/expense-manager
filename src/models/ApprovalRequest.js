const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalRequest = sequelize.define('ApprovalRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  request_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  expense_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'travel',
      'meals',
      'accommodation',
      'transportation',
      'office_supplies',
      'equipment',
      'training',
      'marketing',
      'entertainment',
      'other'
    ),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'credit_card', 'bank_transfer', 'company_card', 'personal_reimbursement'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  amount_usd: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true // Will be calculated via currency conversion
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'in_progress', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  current_approver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'managers',
      key: 'id'
    }
  },
  final_approver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'managers',
      key: 'id'
    }
  },
  approval_sequence: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  approval_history: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
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
  }
}, {
  tableName: 'approval_requests',
  indexes: [
    {
      fields: ['employee_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['current_approver_id']
    },
    {
      fields: ['expense_date']
    },
    {
      fields: ['category']
    }
  ],
  hooks: {
    beforeCreate: (request) => {
      if (!request.request_number) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        request.request_number = `EXP-${timestamp}-${random}`;
      }
    }
  }
});

// Instance methods
ApprovalRequest.prototype.addApprovalHistory = function(approver, action, comments = null) {
  const history = this.approval_history || [];
  history.push({
    approver_id: approver.id,
    approver_name: approver.name,
    approver_type: approver.constructor.name.toLowerCase(),
    action,
    comments,
    timestamp: new Date()
  });
  this.approval_history = history;
};

ApprovalRequest.prototype.canBeApprovedBy = function(manager) {
  return this.current_approver_id === manager.id && this.status === 'in_progress';
};

module.exports = ApprovalRequest;