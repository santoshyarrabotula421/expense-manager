const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
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
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'employee'),
    allowNull: false,
    defaultValue: 'employee'
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  is_manager_approver: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether manager approval is required'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  employee_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: "Company's internal employee ID"
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      name: 'uk_user_email_company',
      fields: ['email', 'company_id']
    },
    {
      name: 'idx_user_company',
      fields: ['company_id']
    },
    {
      name: 'idx_user_manager',
      fields: ['manager_id']
    },
    {
      name: 'idx_user_role',
      fields: ['role']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password_hash;
  return values;
};

// Check if user can approve expenses
User.prototype.canApprove = function() {
  return this.role === 'admin' || this.role === 'manager' || this.is_manager_approver;
};

// Check if user is manager of another user
User.prototype.isManagerOf = function(userId) {
  return this.id === userId || (this.role === 'manager' && this.company_id === userId);
};

module.exports = User;