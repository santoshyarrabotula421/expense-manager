const jwt = require('jsonwebtoken');
const { Admin, Manager, Employee } = require('../models');

// Generate JWT token
const generateToken = (user, role) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: role,
      company_id: user.admin_id || user.id // For admin, use id; for others, use admin_id
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
    
    // Fetch user based on role
    let user;
    switch (decoded.role) {
      case 'admin':
        user = await Admin.findByPk(decoded.id);
        break;
      case 'manager':
        user = await Manager.findByPk(decoded.id, {
          include: [{ model: Admin, as: 'admin' }]
        });
        break;
      case 'employee':
        user = await Employee.findByPk(decoded.id, {
          include: [
            { model: Admin, as: 'admin' },
            { model: Manager, as: 'manager' },
            { model: Employee, as: 'chief' }
          ]
        });
        break;
      default:
        return res.status(401).json({ error: 'Invalid user role' });
    }

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.userRole = decoded.role;
    req.companyId = decoded.company_id;
    
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
        case 'employee':
          // Employees can access their own data, managers can access their employees, admins can access all
          if (req.userRole === 'employee' && req.user.id === parseInt(resourceId)) {
            return next();
          }
          if (req.userRole === 'manager') {
            const employee = await Employee.findByPk(resourceId);
            if (employee && employee.manager_id === req.user.id) {
              return next();
            }
          }
          if (req.userRole === 'admin') {
            const employee = await Employee.findByPk(resourceId);
            if (employee && employee.admin_id === req.user.id) {
              return next();
            }
          }
          break;
          
        case 'manager':
          // Managers can access their own data, admins can access their managers
          if (req.userRole === 'manager' && req.user.id === parseInt(resourceId)) {
            return next();
          }
          if (req.userRole === 'admin') {
            const manager = await Manager.findByPk(resourceId);
            if (manager && manager.admin_id === req.user.id) {
              return next();
            }
          }
          break;
          
        case 'approval_request':
          // Employees can access their own requests, managers can access requests they need to approve
          const request = await require('../models/ApprovalRequest').findByPk(resourceId, {
            include: [{ model: Employee, as: 'employee' }]
          });
          
          if (!request) {
            return res.status(404).json({ error: 'Request not found' });
          }
          
          if (req.userRole === 'employee' && request.employee_id === req.user.id) {
            return next();
          }
          if (req.userRole === 'manager' && 
              (request.current_approver_id === req.user.id || 
               request.final_approver_id === req.user.id)) {
            return next();
          }
          if (req.userRole === 'admin' && request.employee.admin_id === req.user.id) {
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