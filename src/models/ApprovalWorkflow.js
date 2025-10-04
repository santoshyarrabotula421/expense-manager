const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApprovalWorkflow = sequelize.define('ApprovalWorkflow', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'approval_workflows',
  indexes: [
    {
      name: 'idx_workflow_company',
      fields: ['company_id']
    }
  ]
});

// Instance methods
ApprovalWorkflow.prototype.getSteps = async function() {
  const ApprovalWorkflowStep = require('./ApprovalWorkflowStep');
  return await ApprovalWorkflowStep.findAll({
    where: { workflow_id: this.id },
    order: [['step_number', 'ASC']]
  });
};

ApprovalWorkflow.prototype.isApplicableForAmount = function(amount) {
  // This can be extended to check workflow conditions
  return this.is_active;
};

module.exports = ApprovalWorkflow;