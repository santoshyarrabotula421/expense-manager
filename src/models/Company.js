const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'USD',
    validate: {
      len: [3, 10]
    }
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC'
  }
}, {
  tableName: 'companies',
  indexes: [
    {
      name: 'idx_company_name',
      fields: ['name']
    }
  ]
});

module.exports = Company;