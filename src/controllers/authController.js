const { Admin, Manager, Employee } = require('../models');
const { generateToken } = require('../middleware/auth');

// Company registration (creates admin)
const signup = async (req, res) => {
  try {
    const { company_name, name, email, password, country, phone } = req.body;

    // Check if company already exists
    const existingCompany = await Admin.findOne({ where: { company_name } });
    if (existingCompany) {
      return res.status(409).json({ error: 'Company name already exists' });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create admin
    const admin = await Admin.create({
      company_name,
      name,
      email,
      password,
      country,
      phone
    });

    // Generate token
    const token = generateToken(admin, 'admin');

    // Update last login
    await admin.update({ last_login: new Date() });

    res.status(201).json({
      message: 'Company registered successfully',
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        company_name: admin.company_name,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Sign in
const signin = async (req, res) => {
  try {
    const { email, password, role, company_name } = req.body;

    let user;
    let userRole = role;

    switch (role) {
      case 'admin':
        user = await Admin.findOne({ where: { email } });
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        break;

      case 'manager':
        if (!company_name) {
          return res.status(400).json({ error: 'Company name is required for managers' });
        }
        
        // Find admin by company name first
        const adminForManager = await Admin.findOne({ where: { company_name } });
        if (!adminForManager) {
          return res.status(401).json({ error: 'Company not found' });
        }

        user = await Manager.findOne({ 
          where: { email, admin_id: adminForManager.id },
          include: [{ model: Admin, as: 'admin' }]
        });
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        break;

      case 'employee':
        if (!company_name) {
          return res.status(400).json({ error: 'Company name is required for employees' });
        }
        
        // Find admin by company name first
        const adminForEmployee = await Admin.findOne({ where: { company_name } });
        if (!adminForEmployee) {
          return res.status(401).json({ error: 'Company not found' });
        }

        user = await Employee.findOne({ 
          where: { email, admin_id: adminForEmployee.id },
          include: [
            { model: Admin, as: 'admin' },
            { model: Manager, as: 'manager' }
          ]
        });
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid role' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Generate token
    const token = generateToken(user, userRole);

    // Update last login
    await user.update({ last_login: new Date() });

    // Prepare user response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: userRole
    };

    // Add role-specific data
    if (userRole === 'admin') {
      userResponse.company_name = user.company_name;
      userResponse.country = user.country;
    } else {
      userResponse.company_name = user.admin.company_name;
      userResponse.department = user.department;
      userResponse.position = user.position;
      
      if (userRole === 'employee') {
        userResponse.employee_id = user.employee_id;
        userResponse.manager = user.manager ? {
          id: user.manager.id,
          name: user.manager.name,
          email: user.manager.email
        } : null;
      }
    }

    res.json({
      message: 'Sign in successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Sign in failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    const role = req.userRole;

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role,
      phone: user.phone,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    // Add role-specific data
    if (role === 'admin') {
      userResponse.company_name = user.company_name;
      userResponse.country = user.country;
    } else {
      userResponse.department = user.department;
      userResponse.position = user.position;
      
      if (role === 'employee') {
        userResponse.employee_id = user.employee_id;
        userResponse.hire_date = user.hire_date;
        userResponse.manager_id = user.manager_id;
        userResponse.chief_id = user.chief_id;
      } else if (role === 'manager') {
        userResponse.approval_limit = user.approval_limit;
      }
    }

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const { name, phone, department, position } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    
    // Only allow department and position updates for managers and employees
    if (req.userRole !== 'admin') {
      if (department) updateData.department = department;
      if (position) updateData.position = position;
    }

    await user.update(updateData);

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const user = req.user;
    const { current_password, new_password } = req.body;

    // Validate current password
    const isValidPassword = await user.validatePassword(current_password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await user.update({ password: new_password });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Logout (client-side token invalidation)
const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  signup,
  signin,
  getProfile,
  updateProfile,
  changePassword,
  logout
};