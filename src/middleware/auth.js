const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');

// Generate JWT token
const generateToken = (user, role) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: role,
      company_id: user.company_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user with company and manager info
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Company, as: 'company' },
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.userRole = decoded.role;
    req.companyId = user.company_id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required_roles: roles,
        user_role: req.userRole
      });
    }
    next();
  };
};

// Company-specific authorization (ensures users can only access their company data)
const authorizeCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    // If no companyId in params, use user's company
    const targetCompanyId = companyId || req.companyId;
    
    // Admin can access their own company
    if (req.userRole === 'admin' && req.user.id === parseInt(targetCompanyId)) {
      return next();
    }
    
    // Managers and employees can only access their own company
    if ((req.userRole === 'manager' || req.userRole === 'employee') && 
        req.user.admin_id === parseInt(targetCompanyId)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied to this company' });
  } catch (error) {
    console.error('Company authorization error:', error);
    return res.status(500).json({ error: 'Authorization failed' });
  }
};

// Check if user owns the resource or has permission to access it
const authorizeResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      
      switch (resourceType) {
        case 'user':
          // Users can access their own data, managers can access their employees, admins can access all in company
          if (req.user.id === parseInt(resourceId)) {
            return next();
          }
          
          const targetUser = await User.findByPk(resourceId);
          if (!targetUser || targetUser.company_id !== req.user.company_id) {
            return res.status(404).json({ error: 'User not found' });
          }
          
          if (req.userRole === 'manager' && targetUser.manager_id === req.user.id) {
            return next();
          }
          if (req.userRole === 'admin') {
            return next();
          }
          break;
          
        case 'expense':
          // Employees can access their own expenses, managers can access their team's expenses, admins can access all
          const { Expense } = require('../models');
          const expense = await Expense.findByPk(resourceId, {
            include: [{ model: User, as: 'user' }]
          });
          
          if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
          }
          
          if (req.userRole === 'employee' && expense.user_id === req.user.id) {
            return next();
          }
          if (req.userRole === 'manager' && expense.user.manager_id === req.user.id) {
            return next();
          }
          if (req.userRole === 'admin' && expense.company_id === req.user.company_id) {
            return next();
          }
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid resource type' });
      }
      
      return res.status(403).json({ error: 'Access denied to this resource' });
    } catch (error) {
      console.error('Resource authorization error:', error);
      return res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

module.exports = {
  generateToken,
  authenticateToken,
  authorizeRoles,
  authorizeCompany,
  authorizeResourceAccess
};