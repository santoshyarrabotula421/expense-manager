const { getConnection } = require('../config/database');
const { hashPassword, generateRandomPassword } = require('../utils/password');

class AdminController {
  async getDashboard(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;

      // Get dashboard statistics
      const [stats] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM managers WHERE admin_id = ?) as total_managers,
          (SELECT COUNT(*) FROM employees WHERE admin_id = ?) as total_employees,
          (SELECT COUNT(*) FROM approval_requests WHERE admin_id = ? AND status = 'pending') as pending_requests,
          (SELECT COALESCE(SUM(converted_amount), 0) FROM approval_requests WHERE admin_id = ? AND status = 'approved') as total_approved_amount,
          (SELECT COUNT(*) FROM approval_requests WHERE admin_id = ? AND status = 'approved') as total_approved_requests,
          (SELECT COUNT(*) FROM approval_requests WHERE admin_id = ? AND status = 'rejected') as total_rejected_requests
      `, [adminId, adminId, adminId, adminId, adminId, adminId]);

      // Get recent requests
      const [recentRequests] = await connection.execute(`
        SELECT 
          ar.id,
          ar.title,
          ar.amount,
          ar.currency,
          ar.status,
          ar.created_at,
          e.name as employee_name,
          ec.name as category_name
        FROM approval_requests ar
        JOIN employees e ON ar.employee_id = e.id
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        WHERE ar.admin_id = ?
        ORDER BY ar.created_at DESC
        LIMIT 10
      `, [adminId]);

      // Get monthly expense trends (last 6 months)
      const [monthlyTrends] = await connection.execute(`
        SELECT 
          DATE_FORMAT(expense_date, '%Y-%m') as month,
          COUNT(*) as request_count,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN converted_amount ELSE 0 END), 0) as approved_amount,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN converted_amount ELSE 0 END), 0) as rejected_amount
        FROM approval_requests 
        WHERE admin_id = ? 
          AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
        ORDER BY month DESC
      `, [adminId]);

      res.json({
        statistics: stats[0],
        recentRequests,
        monthlyTrends
      });

    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({
        error: 'Failed to load dashboard',
        message: 'Internal server error while loading dashboard data'
      });
    }
  }

  async getManagers(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get managers with employee count
      const [managers] = await connection.execute(`
        SELECT 
          m.id,
          m.name,
          m.email,
          m.department,
          m.is_active,
          m.created_at,
          COUNT(e.id) as employee_count
        FROM managers m
        LEFT JOIN employees e ON m.id = e.manager_id AND e.is_active = 1
        WHERE m.admin_id = ?
        GROUP BY m.id, m.name, m.email, m.department, m.is_active, m.created_at
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `, [adminId, limit, offset]);

      // Get total count
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM managers WHERE admin_id = ?',
        [adminId]
      );

      res.json({
        managers,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Get managers error:', error);
      res.status(500).json({
        error: 'Failed to fetch managers',
        message: 'Internal server error while fetching managers'
      });
    }
  }

  async createManager(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const { name, email, password, department } = req.body;

      // Check if email already exists for this company
      const [existingManager] = await connection.execute(
        'SELECT id FROM managers WHERE admin_id = ? AND email = ?',
        [adminId, email]
      );

      if (existingManager.length > 0) {
        return res.status(400).json({
          error: 'Email already exists',
          message: 'A manager with this email already exists in your company'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create manager
      const [result] = await connection.execute(
        'INSERT INTO managers (admin_id, name, email, password_hash, department) VALUES (?, ?, ?, ?, ?)',
        [adminId, name, email, passwordHash, department]
      );

      // Get created manager
      const [manager] = await connection.execute(
        'SELECT id, name, email, department, is_active, created_at FROM managers WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        message: 'Manager created successfully',
        manager: manager[0]
      });

    } catch (error) {
      console.error('Create manager error:', error);
      res.status(500).json({
        error: 'Failed to create manager',
        message: 'Internal server error while creating manager'
      });
    }
  }

  async updateManager(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const managerId = req.params.id;
      const { name, email, department, is_active } = req.body;

      // Verify manager belongs to this admin
      const [existingManager] = await connection.execute(
        'SELECT id FROM managers WHERE id = ? AND admin_id = ?',
        [managerId, adminId]
      );

      if (existingManager.length === 0) {
        return res.status(404).json({
          error: 'Manager not found',
          message: 'Manager not found or does not belong to your company'
        });
      }

      // Check if new email conflicts with existing managers
      if (email) {
        const [emailConflict] = await connection.execute(
          'SELECT id FROM managers WHERE admin_id = ? AND email = ? AND id != ?',
          [adminId, email, managerId]
        );

        if (emailConflict.length > 0) {
          return res.status(400).json({
            error: 'Email already exists',
            message: 'Another manager with this email already exists in your company'
          });
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];

      if (name) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (email) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      if (department !== undefined) {
        updateFields.push('department = ?');
        updateValues.push(department);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'No updates provided',
          message: 'Please provide at least one field to update'
        });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(managerId);

      await connection.execute(
        `UPDATE managers SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated manager
      const [updatedManager] = await connection.execute(
        'SELECT id, name, email, department, is_active, created_at, updated_at FROM managers WHERE id = ?',
        [managerId]
      );

      res.json({
        message: 'Manager updated successfully',
        manager: updatedManager[0]
      });

    } catch (error) {
      console.error('Update manager error:', error);
      res.status(500).json({
        error: 'Failed to update manager',
        message: 'Internal server error while updating manager'
      });
    }
  }

  async deleteManager(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const managerId = req.params.id;

      // Check if manager has employees
      const [employees] = await connection.execute(
        'SELECT COUNT(*) as count FROM employees WHERE manager_id = ? AND is_active = 1',
        [managerId]
      );

      if (employees[0].count > 0) {
        return res.status(400).json({
          error: 'Cannot delete manager',
          message: 'Manager has active employees. Please reassign or deactivate employees first.'
        });
      }

      // Verify manager belongs to this admin
      const [result] = await connection.execute(
        'DELETE FROM managers WHERE id = ? AND admin_id = ?',
        [managerId, adminId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Manager not found',
          message: 'Manager not found or does not belong to your company'
        });
      }

      res.json({
        message: 'Manager deleted successfully'
      });

    } catch (error) {
      console.error('Delete manager error:', error);
      res.status(500).json({
        error: 'Failed to delete manager',
        message: 'Internal server error while deleting manager'
      });
    }
  }

  async getEmployees(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const managerId = req.query.manager_id;

      let whereClause = 'WHERE e.admin_id = ?';
      let queryParams = [adminId];

      if (managerId) {
        whereClause += ' AND e.manager_id = ?';
        queryParams.push(managerId);
      }

      // Get employees with manager info and approval rules
      const [employees] = await connection.execute(`
        SELECT 
          e.id,
          e.name,
          e.email,
          e.department,
          e.position,
          e.is_active,
          e.created_at,
          m.name as manager_name,
          COUNT(ar.id) as approval_rules_count
        FROM employees e
        JOIN managers m ON e.manager_id = m.id
        LEFT JOIN approval_rules ar ON e.id = ar.employee_id
        ${whereClause}
        GROUP BY e.id, e.name, e.email, e.department, e.position, e.is_active, e.created_at, m.name
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, limit, offset]);

      // Get total count
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM employees e ${whereClause}`,
        queryParams
      );

      res.json({
        employees,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({
        error: 'Failed to fetch employees',
        message: 'Internal server error while fetching employees'
      });
    }
  }

  async createEmployee(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const { name, email, password, manager_id, department, position } = req.body;

      // Verify manager belongs to this admin
      const [manager] = await connection.execute(
        'SELECT id FROM managers WHERE id = ? AND admin_id = ? AND is_active = 1',
        [manager_id, adminId]
      );

      if (manager.length === 0) {
        return res.status(400).json({
          error: 'Invalid manager',
          message: 'Selected manager not found or inactive'
        });
      }

      // Check if email already exists for this company
      const [existingEmployee] = await connection.execute(
        'SELECT id FROM employees WHERE admin_id = ? AND email = ?',
        [adminId, email]
      );

      if (existingEmployee.length > 0) {
        return res.status(400).json({
          error: 'Email already exists',
          message: 'An employee with this email already exists in your company'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create employee
      const [result] = await connection.execute(
        'INSERT INTO employees (admin_id, manager_id, name, email, password_hash, department, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminId, manager_id, name, email, passwordHash, department, position]
      );

      // Get created employee with manager info
      const [employee] = await connection.execute(`
        SELECT 
          e.id, e.name, e.email, e.department, e.position, e.is_active, e.created_at,
          m.name as manager_name
        FROM employees e
        JOIN managers m ON e.manager_id = m.id
        WHERE e.id = ?
      `, [result.insertId]);

      res.status(201).json({
        message: 'Employee created successfully',
        employee: employee[0]
      });

    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({
        error: 'Failed to create employee',
        message: 'Internal server error while creating employee'
      });
    }
  }

  async updateEmployee(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const employeeId = req.params.id;
      const { name, email, manager_id, department, position, is_active } = req.body;

      // Verify employee belongs to this admin
      const [existingEmployee] = await connection.execute(
        'SELECT id FROM employees WHERE id = ? AND admin_id = ?',
        [employeeId, adminId]
      );

      if (existingEmployee.length === 0) {
        return res.status(404).json({
          error: 'Employee not found',
          message: 'Employee not found or does not belong to your company'
        });
      }

      // Verify manager if provided
      if (manager_id) {
        const [manager] = await connection.execute(
          'SELECT id FROM managers WHERE id = ? AND admin_id = ? AND is_active = 1',
          [manager_id, adminId]
        );

        if (manager.length === 0) {
          return res.status(400).json({
            error: 'Invalid manager',
            message: 'Selected manager not found or inactive'
          });
        }
      }

      // Check email conflicts
      if (email) {
        const [emailConflict] = await connection.execute(
          'SELECT id FROM employees WHERE admin_id = ? AND email = ? AND id != ?',
          [adminId, email, employeeId]
        );

        if (emailConflict.length > 0) {
          return res.status(400).json({
            error: 'Email already exists',
            message: 'Another employee with this email already exists in your company'
          });
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];

      if (name) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (email) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      if (manager_id) {
        updateFields.push('manager_id = ?');
        updateValues.push(manager_id);
      }
      if (department !== undefined) {
        updateFields.push('department = ?');
        updateValues.push(department);
      }
      if (position !== undefined) {
        updateFields.push('position = ?');
        updateValues.push(position);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'No updates provided',
          message: 'Please provide at least one field to update'
        });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(employeeId);

      await connection.execute(
        `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated employee with manager info
      const [updatedEmployee] = await connection.execute(`
        SELECT 
          e.id, e.name, e.email, e.department, e.position, e.is_active, e.created_at, e.updated_at,
          m.name as manager_name
        FROM employees e
        JOIN managers m ON e.manager_id = m.id
        WHERE e.id = ?
      `, [employeeId]);

      res.json({
        message: 'Employee updated successfully',
        employee: updatedEmployee[0]
      });

    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({
        error: 'Failed to update employee',
        message: 'Internal server error while updating employee'
      });
    }
  }

  async deleteEmployee(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const employeeId = req.params.id;

      // Check if employee has pending requests
      const [pendingRequests] = await connection.execute(
        'SELECT COUNT(*) as count FROM approval_requests WHERE employee_id = ? AND status = "pending"',
        [employeeId]
      );

      if (pendingRequests[0].count > 0) {
        return res.status(400).json({
          error: 'Cannot delete employee',
          message: 'Employee has pending expense requests. Please resolve them first.'
        });
      }

      // Verify employee belongs to this admin and delete
      const [result] = await connection.execute(
        'DELETE FROM employees WHERE id = ? AND admin_id = ?',
        [employeeId, adminId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Employee not found',
          message: 'Employee not found or does not belong to your company'
        });
      }

      res.json({
        message: 'Employee deleted successfully'
      });

    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({
        error: 'Failed to delete employee',
        message: 'Internal server error while deleting employee'
      });
    }
  }

  async getExpenseCategories(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;

      const [categories] = await connection.execute(
        'SELECT id, name, description, is_active, created_at FROM expense_categories WHERE admin_id = ? ORDER BY name',
        [adminId]
      );

      res.json({ categories });

    } catch (error) {
      console.error('Get expense categories error:', error);
      res.status(500).json({
        error: 'Failed to fetch expense categories',
        message: 'Internal server error while fetching expense categories'
      });
    }
  }

  async createExpenseCategory(req, res) {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const { name, description } = req.body;

      // Check if category already exists
      const [existingCategory] = await connection.execute(
        'SELECT id FROM expense_categories WHERE admin_id = ? AND name = ?',
        [adminId, name]
      );

      if (existingCategory.length > 0) {
        return res.status(400).json({
          error: 'Category already exists',
          message: 'A category with this name already exists'
        });
      }

      // Create category
      const [result] = await connection.execute(
        'INSERT INTO expense_categories (admin_id, name, description) VALUES (?, ?, ?)',
        [adminId, name, description]
      );

      // Get created category
      const [category] = await connection.execute(
        'SELECT id, name, description, is_active, created_at FROM expense_categories WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        message: 'Category created successfully',
        category: category[0]
      });

    } catch (error) {
      console.error('Create expense category error:', error);
      res.status(500).json({
        error: 'Failed to create expense category',
        message: 'Internal server error while creating expense category'
      });
    }
  }
}

module.exports = new AdminController();