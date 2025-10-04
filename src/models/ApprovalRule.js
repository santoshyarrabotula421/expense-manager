const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalRule = sequelize.define('ApprovalRule', {
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
  approver_sequence: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of manager IDs in approval order'
  },
  threshold_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 100.00,
    validate: {
      min: 0.00,
      max: 100.00
    },
    comment: 'Percentage threshold for automatic approval'
  },
  minimum_threshold_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0.00
    },
    comment: 'Minimum amount that requires approval regardless of percentage'
  },
  approval_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description/guidelines for approvers'
  },
  requires_chief_approval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether chief approval is required'
  },
  chief_approval_threshold: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Amount threshold above which chief approval is required'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  effective_from: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  effective_to: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'approval_rules',
  indexes: [
    {
      fields: ['employee_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['effective_from', 'effective_to']
    }
  ]
});

// Instance methods
ApprovalRule.prototype.isEffective = function(date = new Date()) {
  const effectiveFrom = new Date(this.effective_from);
  const effectiveTo = this.effective_to ? new Date(this.effective_to) : null;
  
  return date >= effectiveFrom && (!effectiveTo || date <= effectiveTo);
};

ApprovalRule.prototype.requiresApproval = function(amount) {
  return amount >= this.minimum_threshold_amount;
};

ApprovalRule.prototype.requiresChiefApproval = function(amount) {
  return this.requires_chief_approval && 
         this.chief_approval_threshold && 
         amount >= this.chief_approval_threshold;
};

ApprovalRule.prototype.getApprovalSequence = function() {
  return this.approver_sequence || [];
};

module.exports = ApprovalRule;