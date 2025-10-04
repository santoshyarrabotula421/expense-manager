const { Company, User } = require('../models');
const { generateToken } = require('../middleware/auth');

// Company registration (creates admin)
const signup = async (req, res) => {
  try {
    const { company_name, name, email, password, country, phone } = req.body;

    // Check if company already exists
    const existingCompany = await Company.findOne({ where: { name: company_name } });
    if (existingCompany) {
      return res.status(409).json({ error: 'Company name already exists' });
    }

    // Create company first
    const company = await Company.create({
      name: company_name,
      country,
      currency: 'USD', // Default currency
      timezone: 'UTC'
    });

    // Create admin user
    const admin = await User.create({
      company_id: company.id,
      name,
      email,
      password_hash: password, // Will be hashed by the model hook
      role: 'admin'
    });

    // Generate token
    const token = generateToken(admin, 'admin');

    res.status(201).json({
      message: 'Company registered successfully',
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        company_name: company.name,
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
    let company;

    if (role === 'admin') {
      // For admin, find user and their company
      user = await User.findOne({ 
        where: { email, role: 'admin' },
        include: [{ model: Company, as: 'company' }]
      });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      company = user.company;
    } else {
      // For manager/employee, find company first
      if (!company_name) {
        return res.status(400).json({ error: 'Company name is required' });
      }
      
      company = await Company.findOne({ where: { name: company_name } });
      if (!company) {
        return res.status(401).json({ error: 'Company not found' });
      }

      user = await User.findOne({ 
        where: { 
          email, 
          company_id: company.id,
          role: role
        },
        include: [
          { model: Company, as: 'company' },
          { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
        ]
      });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
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
    const token = generateToken(user, role);

    // Prepare user response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role,
      company_name: company.name,
      department: user.department
    };

    if (role === 'employee') {
      userResponse.employee_id = user.employee_id;
      userResponse.manager = user.manager ? {
        id: user.manager.id,
        name: user.manager.name,
        email: user.manager.email
      } : null;
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