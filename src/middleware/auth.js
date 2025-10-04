const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const connection = getConnection();
    let userQuery, userTable;
    
    switch (decoded.role) {
      case 'admin':
        userTable = 'admins';
        userQuery = 'SELECT id, company_name, admin_name as name, email, is_active FROM admins WHERE id = ?';
        break;
      case 'manager':
        userTable = 'managers';
        userQuery = 'SELECT m.id, m.admin_id, m.name, m.email, m.is_active, a.company_name FROM managers m JOIN admins a ON m.admin_id = a.id WHERE m.id = ?';
        break;
      case 'employee':
        userTable = 'employees';
        userQuery = 'SELECT e.id, e.admin_id, e.manager_id, e.name, e.email, e.is_active, a.company_name FROM employees e JOIN admins a ON e.admin_id = a.id WHERE e.id = ?';
        break;
      default:
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token contains invalid role'
        });
    }

    const [rows] = await connection.execute(userQuery, [decoded.userId]);
    
    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or inactive'
      });
    }

    // Add user info to request
    req.user = {
      id: rows[0].id,
      role: decoded.role,
      name: rows[0].name,
      email: rows[0].email,
      company_name: rows[0].company_name,
      admin_id: rows[0].admin_id || rows[0].id, // For admin, admin_id is their own id
      manager_id: rows[0].manager_id || null
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This endpoint requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

const checkCompanyAccess = async (req, res, next) => {
  try {
    // Admin has access to their own company data
    if (req.user.role === 'admin') {
      return next();
    }

    // For managers and employees, ensure they belong to the same company
    const targetAdminId = req.params.adminId || req.body.adminId || req.query.adminId;
    
    if (targetAdminId && parseInt(targetAdminId) !== req.user.admin_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access data from your own company'
      });
    }

    next();
  } catch (error) {
    console.error('Company access check error:', error);
    return res.status(500).json({
      error: 'Authorization failed',
      message: 'Internal server error during authorization'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  checkCompanyAccess
};