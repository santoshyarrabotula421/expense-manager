const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  expense_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'expenses',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('approval_request', 'approved', 'rejected', 'escalated', 'reminder'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_email_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'notifications',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_notification_user',
      fields: ['user_id']
    },
    {
      name: 'idx_notification_read',
      fields: ['is_read']
    },
    {
      name: 'idx_notification_type',
      fields: ['type']
    }
  ]
});

// Instance methods
Notification.prototype.markAsRead = async function() {
  if (!this.is_read) {
    await this.update({ is_read: true });
  }
  return this;
};

Notification.prototype.markEmailAsSent = async function() {
  if (!this.is_email_sent) {
    await this.update({ is_email_sent: true });
  }
  return this;
};

Notification.prototype.getTypeIcon = function() {
  const icons = {
    'approval_request': '📋',
    'approved': '✅',
    'rejected': '❌',
    'escalated': '⬆️',
    'reminder': '⏰'
  };
  return icons[this.type] || '📢';
};

Notification.prototype.getTypeColor = function() {
  const colors = {
    'approval_request': 'blue',
    'approved': 'green',
    'rejected': 'red',
    'escalated': 'orange',
    'reminder': 'yellow'
  };
  return colors[this.type] || 'gray';
};

Notification.prototype.getTimeSince = function() {
  const now = new Date();
  const createdTime = new Date(this.created_at);
  const diffTime = Math.abs(now - createdTime);
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

// Class methods
Notification.createApprovalRequest = async function(userId, expenseId, expenseAmount, submitterName) {
  return await this.create({
    user_id: userId,
    expense_id: expenseId,
    type: 'approval_request',
    title: 'New Expense Approval Request',
    message: `${submitterName} has submitted an expense of $${expenseAmount} for your approval.`
  });
};

Notification.createApprovalResult = async function(userId, expenseId, approved, approverName, comments = null) {
  const type = approved ? 'approved' : 'rejected';
  const action = approved ? 'approved' : 'rejected';
  const title = `Expense ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  
  let message = `Your expense has been ${action} by ${approverName}.`;
  if (comments) {
    message += ` Comments: ${comments}`;
  }
  
  return await this.create({
    user_id: userId,
    expense_id: expenseId,
    type: type,
    title: title,
    message: message
  });
};

Notification.createEscalation = async function(userId, expenseId, reason) {
  return await this.create({
    user_id: userId,
    expense_id: expenseId,
    type: 'escalated',
    title: 'Expense Escalated',
    message: `An expense has been escalated to you. Reason: ${reason}`
  });
};

Notification.createReminder = async function(userId, expenseId, daysOverdue) {
  return await this.create({
    user_id: userId,
    expense_id: expenseId,
    type: 'reminder',
    title: 'Pending Approval Reminder',
    message: `You have an expense approval that has been pending for ${daysOverdue} days.`
  });
};

Notification.getUnreadCount = async function(userId) {
  return await this.count({
    where: {
      user_id: userId,
      is_read: false
    }
  });
};

Notification.getUserNotifications = async function(userId, options = {}) {
  const queryOptions = {
    where: { user_id: userId },
    include: [
      {
        model: require('./Expense'),
        as: 'expense',
        attributes: ['id', 'amount', 'description', 'status'],
        required: false
      }
    ],
    order: [['created_at', 'DESC']]
  };
  
  if (options.unreadOnly) {
    queryOptions.where.is_read = false;
  }
  
  if (options.limit) {
    queryOptions.limit = options.limit;
  }
  
  if (options.offset) {
    queryOptions.offset = options.offset;
  }
  
  return await this.findAll(queryOptions);
};

Notification.markAllAsRead = async function(userId) {
  return await this.update(
    { is_read: true },
    {
      where: {
        user_id: userId,
        is_read: false
      }
    }
  );
};

Notification.cleanupOldNotifications = async function(days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return await this.destroy({
    where: {
      created_at: {
        [sequelize.Op.lt]: cutoffDate
      },
      is_read: true
    }
  });
};

module.exports = Notification;