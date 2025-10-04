const { sequelize } = require('../config/database');
const Admin = require('./Admin');
const Manager = require('./Manager');
const Employee = require('./Employee');
const ApprovalRequest = require('./ApprovalRequest');
const ApprovalRule = require('./ApprovalRule');

// Define associations
Admin.hasMany(Manager, { foreignKey: 'admin_id', as: 'managers' });
Manager.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

Admin.hasMany(Employee, { foreignKey: 'admin_id', as: 'employees' });
Employee.belongsTo(Admin, { foreignKey: 'admin_id', as: 'admin' });

Manager.hasMany(Employee, { foreignKey: 'manager_id', as: 'employees' });
Employee.belongsTo(Manager, { foreignKey: 'manager_id', as: 'manager' });

Employee.hasMany(ApprovalRequest, { foreignKey: 'employee_id', as: 'approval_requests' });
ApprovalRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(ApprovalRule, { foreignKey: 'employee_id', as: 'approval_rules' });
ApprovalRule.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Chief relationship (self-referencing Employee)
Employee.belongsTo(Employee, { foreignKey: 'chief_id', as: 'chief' });
Employee.hasMany(Employee, { foreignKey: 'chief_id', as: 'subordinates' });

// Approver relationships
ApprovalRequest.belongsTo(Manager, { foreignKey: 'current_approver_id', as: 'current_approver' });
ApprovalRequest.belongsTo(Manager, { foreignKey: 'final_approver_id', as: 'final_approver' });

module.exports = {
  sequelize,
  Admin,
  Manager,
  Employee,
  ApprovalRequest,
  ApprovalRule
};