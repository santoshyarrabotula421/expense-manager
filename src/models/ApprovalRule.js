const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalRule = sequelize.define('ApprovalRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    comment: 'NULL means global rule'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  rule_type: {
    type: DataTypes.ENUM('percentage', 'specific_approver', 'hybrid', 'threshold', 'category'),
    allowNull: false
  },
  condition_field: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'amount, category, department'
  },
  condition_operator: {
    type: DataTypes.ENUM('>', '>=', '<', '<=', '=', 'IN', 'NOT IN'),
    allowNull: false
  },
  condition_value: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Value to compare against'
  },
  action_type: {
    type: DataTypes.ENUM('auto_approve', 'require_approval', 'skip_step', 'add_approver'),
    allowNull: false
  },
  action_value: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional parameters for the action'
  },
  percentage_threshold: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'For percentage rules (0-100)'
  },
  specific_approver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'For specific approver rules'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Higher priority rules execute first'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'approval_rules',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_rule_company',
      fields: ['company_id']
    },
    {
      name: 'idx_rule_workflow',
      fields: ['workflow_id']
    },
    {
      name: 'idx_rule_priority',
      fields: [['priority', 'DESC']]
    }
  ]
});

// Instance methods
ApprovalRule.prototype.evaluateCondition = function(expense) {
  const fieldValue = this.getFieldValue(expense, this.condition_field);
  const conditionValue = this.condition_value;
  
  switch (this.condition_operator) {
    case '>':
      return fieldValue > conditionValue;
    case '>=':
      return fieldValue >= conditionValue;
    case '<':
      return fieldValue < conditionValue;
    case '<=':
      return fieldValue <= conditionValue;
    case '=':
      return fieldValue === conditionValue;
    case 'IN':
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'NOT IN':
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    default:
      return false;
  }
};

ApprovalRule.prototype.getFieldValue = function(expense, field) {
  switch (field) {
    case 'amount':
      return parseFloat(expense.amount_in_company_currency || expense.amount);
    case 'category':
      return expense.category_id;
    case 'department':
      return expense.user?.department;
    default:
      return expense[field];
  }
};

ApprovalRule.prototype.executeAction = function(expense, workflowSteps) {
  switch (this.action_type) {
    case 'auto_approve':
      return { action: 'auto_approve', data: this.action_value };
    case 'require_approval':
      return { action: 'require_approval', approver_id: this.specific_approver_id };
    case 'skip_step':
      return { action: 'skip_step', step_number: this.action_value?.step_number };
    case 'add_approver':
      return { action: 'add_approver', approver_id: this.action_value?.approver_id };
    default:
      return null;
  }
};

ApprovalRule.prototype.isApplicable = function(expense, workflow = null) {
  // Check if rule is active
  if (!this.is_active) return false;
  
  // Check if rule applies to the workflow (or is global)
  if (this.workflow_id && workflow && this.workflow_id !== workflow.id) {
    return false;
  }
  
  // Evaluate the condition
  return this.evaluateCondition(expense);
};

module.exports = ApprovalRule;