const { getConnection } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAuthTokens } = require('../utils/jwt');

class AuthController {
  async signUp(req, res) {
    const connection = getConnection();
    
    try {
      const { company_name, admin_name, email, password, country } = req.body;

      // Check if company already exists
      const [existingCompany] = await connection.execute(
        'SELECT id FROM admins WHERE company_name = ?',
        [company_name]
      );

      if (existingCompany.length > 0) {
        return res.status(400).json({
          error: 'Company already exists',
          message: 'A company with this name is already registered'
        });
      }

      // Check if email already exists
      const [existingEmail] = await connection.execute(
        'SELECT id FROM admins WHERE email = ?',
        [email]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({
          error: 'Email already exists',
          message: 'An account with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create admin account
      const [result] = await connection.execute(
        `INSERT INTO admins (company_name, admin_name, email, password_hash, country) 
         VALUES (?, ?, ?, ?, ?)`,
        [company_name, admin_name, email, passwordHash, country]
      );

      // Create default expense categories for the company
      const defaultCategories = [
        'Travel & Transportation',
        'Meals & Entertainment', 
        'Office Supplies',
        'Software & Subscriptions',
        'Training & Development',
        'Marketing & Advertising',
        'Utilities',
        'Equipment & Hardware',
        'Professional Services',
        'Other'
      ];

      const categoryInserts = defaultCategories.map(category => [result.insertId, category]);
      await connection.execute(
        `INSERT INTO expense_categories (admin_id, name) VALUES ${categoryInserts.map(() => '(?, ?)').join(', ')}`,
        categoryInserts.flat()
      );

      // Get created admin
      const [admin] = await connection.execute(
        'SELECT id, company_name, admin_name, email, country, created_at FROM admins WHERE id = ?',
        [result.insertId]
      );

      // Generate tokens
      const tokens = generateAuthTokens(admin[0], 'admin');

      res.status(201).json({
        message: 'Company registered successfully',
        user: {
          id: admin[0].id,
          company_name: admin[0].company_name,
          name: admin[0].admin_name,
          email: admin[0].email,
          role: 'admin',
          country: admin[0].country,
          created_at: admin[0].created_at
        },
        ...tokens
      });

    } catch (error) {
      console.error('Sign up error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Internal server error during registration'
      });
    }
  }

  async signIn(req, res) {
    const connection = getConnection();
    
    try {
      const { email, password, role, company_name } = req.body;

      let user = null;
      let userRole = role;

      switch (role) {
        case 'admin':
          const [admins] = await connection.execute(
            'SELECT id, company_name, admin_name as name, email, password_hash, is_active FROM admins WHERE email = ?',
            [email]
          );
          user = admins[0];
          break;

        case 'manager':
          if (!company_name) {
            return res.status(400).json({
              error: 'Company name required',
              message: 'Company name is required for manager login'
            });
          }

          const [managers] = await connection.execute(
            `SELECT m.id, m.name, m.email, m.password_hash, m.is_active, a.company_name, m.admin_id
             FROM managers m 
             JOIN admins a ON m.admin_id = a.id 
             WHERE m.email = ? AND a.company_name = ?`,
            [email, company_name]
          );
          user = managers[0];
          break;

        case 'employee':
          if (!company_name) {
            return res.status(400).json({
              error: 'Company name required',
              message: 'Company name is required for employee login'
            });
          }

          const [employees] = await connection.execute(
            `SELECT e.id, e.name, e.email, e.password_hash, e.is_active, a.company_name, e.admin_id, e.manager_id
             FROM employees e 
             JOIN admins a ON e.admin_id = a.id 
             WHERE e.email = ? AND a.company_name = ?`,
            [email, company_name]
          );
          user = employees[0];
          break;

        default:
          return res.status(400).json({
            error: 'Invalid role',
            message: 'Role must be admin, manager, or employee'
          });
      }

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email, password, or company name is incorrect'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          error: 'Account inactive',
          message: 'Your account has been deactivated. Please contact your administrator.'
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email, password, or company name is incorrect'
        });
      }

      // Generate tokens
      const tokens = generateAuthTokens(user, userRole);

      // Remove password hash from response
      delete user.password_hash;

      res.json({
        message: 'Sign in successful',
        user: {
          ...user,
          role: userRole
        },
        ...tokens
      });

    } catch (error) {
      console.error('Sign in error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        message: 'Internal server error during authentication'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      // For now, we'll implement a simple token refresh
      // In production, you might want to use refresh tokens
      const user = req.user;
      const tokens = generateAuthTokens(user, user.role);

      res.json({
        message: 'Token refreshed successfully',
        ...tokens
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed',
        message: 'Internal server error during token refresh'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = req.user;
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_name: user.company_name,
          admin_id: user.admin_id,
          manager_id: user.manager_id
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get profile',
        message: 'Internal server error while fetching profile'
      });
    }
  }

  async updateProfile(req, res) {
    const connection = getConnection();
    
    try {
      const user = req.user;
      const { name, current_password, new_password } = req.body;

      let updateFields = [];
      let updateValues = [];

      // Update name if provided
      if (name && name.trim() !== '') {
        updateFields.push('name = ?');
        updateValues.push(name.trim());
      }

      // Update password if provided
      if (new_password) {
        if (!current_password) {
          return res.status(400).json({
            error: 'Current password required',
            message: 'Current password is required to set a new password'
          });
        }

        // Get current password hash
        let table, nameField;
        switch (user.role) {
          case 'admin':
            table = 'admins';
            nameField = 'admin_name';
            break;
          case 'manager':
            table = 'managers';
            nameField = 'name';
            break;
          case 'employee':
            table = 'employees';
            nameField = 'name';
            break;
        }

        const [currentUser] = await connection.execute(
          `SELECT password_hash FROM ${table} WHERE id = ?`,
          [user.id]
        );

        if (!currentUser.length) {
          return res.status(404).json({
            error: 'User not found',
            message: 'User account not found'
          });
        }

        // Verify current password
        const isValidPassword = await comparePassword(current_password, currentUser[0].password_hash);
        if (!isValidPassword) {
          return res.status(400).json({
            error: 'Invalid current password',
            message: 'Current password is incorrect'
          });
        }

        // Hash new password
        const newPasswordHash = await hashPassword(new_password);
        updateFields.push('password_hash = ?');
        updateValues.push(newPasswordHash);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'No updates provided',
          message: 'Please provide at least one field to update'
        });
      }

      // Determine table and name field based on role
      let table, nameField;
      switch (user.role) {
        case 'admin':
          table = 'admins';
          nameField = 'admin_name';
          break;
        case 'manager':
          table = 'managers';
          nameField = 'name';
          break;
        case 'employee':
          table = 'employees';
          nameField = 'name';
          break;
      }

      // Update user
      updateFields.push('updated_at = NOW()');
      updateValues.push(user.id);

      await connection.execute(
        `UPDATE ${table} SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated user info
      const [updatedUser] = await connection.execute(
        `SELECT id, ${nameField} as name, email FROM ${table} WHERE id = ?`,
        [user.id]
      );

      res.json({
        message: 'Profile updated successfully',
        user: {
          ...updatedUser[0],
          role: user.role,
          company_name: user.company_name
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Profile update failed',
        message: 'Internal server error during profile update'
      });
    }
  }
}

module.exports = new AuthController();