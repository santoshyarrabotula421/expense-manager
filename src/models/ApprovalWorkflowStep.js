const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalWorkflowStep = sequelize.define('ApprovalWorkflowStep', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  workflow_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'approval_workflows',
      key: 'id'
    }
  },
  step_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Order of approval (1, 2, 3...)'
  },
  step_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  approver_type: {
    type: DataTypes.ENUM('specific_user', 'role', 'manager', 'department_head', 'finance', 'cfo'),
    allowNull: false
  },
  approver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Specific user ID if approver_type is specific_user'
  },
  approver_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Role name if approver_type is role'
  },
  is_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  condition_amount_min: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  condition_amount_max: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  condition_category_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of category IDs this step applies to'
  },
  auto_approve_threshold: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  }
}, {
  tableName: 'approval_workflow_steps',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_workflow_steps',
      fields: ['workflow_id', 'step_number']
    },
    {
      name: 'idx_approver',
      fields: ['approver_id']
    }
  ]
});

// Instance methods
ApprovalWorkflowStep.prototype.isApplicableForExpense = function(expense) {
  // Check amount conditions
  if (this.condition_amount_min && expense.amount < this.condition_amount_min) {
    return false;
  }
  
  if (this.condition_amount_max && expense.amount > this.condition_amount_max) {
    return false;
  }
  
  // Check category conditions
  if (this.condition_category_ids && this.condition_category_ids.length > 0) {
    if (!this.condition_category_ids.includes(expense.category_id)) {
      return false;
    }
  }
  
  return true;
};

ApprovalWorkflowStep.prototype.shouldAutoApprove = function(amount) {
  return this.auto_approve_threshold && amount <= this.auto_approve_threshold;
};

ApprovalWorkflowStep.prototype.getApprover = async function(expense) {
  const User = require('./User');
  
  switch (this.approver_type) {
    case 'specific_user':
      return await User.findByPk(this.approver_id);
      
    case 'manager':
      // Get the expense submitter's manager
      const submitter = await User.findByPk(expense.user_id);
      if (submitter && submitter.manager_id) {
        return await User.findByPk(submitter.manager_id);
      }
      return null;
      
    case 'role':
      // Find users with specific role in the company
      return await User.findAll({
        where: {
          company_id: expense.company_id,
          role: this.approver_role,
          is_active: true
        }
      });
      
    case 'department_head':
      // Find department head (manager in same department)
      const expenseUser = await User.findByPk(expense.user_id);
      return await User.findOne({
        where: {
          company_id: expense.company_id,
          department: expenseUser.department,
          role: 'manager',
          is_active: true
        }
      });
      
    case 'finance':
    case 'cfo':
      // Find users with finance or cfo role
      return await User.findAll({
        where: {
          company_id: expense.company_id,
          role: this.approver_type,
          is_active: true
        }
      });
      
    default:
      return null;
  }
};

module.exports = ApprovalWorkflowStep;