#!/usr/bin/env node

/**
 * Setup script for expense-manager backend
 * This script helps initialize the application with default data
 */

const { sequelize, Company, User, ExpenseCategory, ApprovalWorkflow, ApprovalWorkflowStep } = require('../src/models');
const bcrypt = require('bcryptjs');

const DEFAULT_CATEGORIES = [
  { name: 'Travel', description: 'Transportation, flights, car rentals' },
  { name: 'Meals', description: 'Business meals and entertainment' },
  { name: 'Accommodation', description: 'Hotels and lodging' },
  { name: 'Office Supplies', description: 'Stationery, equipment, software' },
  { name: 'Training', description: 'Courses, conferences, certifications' },
  { name: 'Marketing', description: 'Advertising, promotional materials' },
  { name: 'Equipment', description: 'Hardware, tools, machinery' },
  { name: 'Telecommunications', description: 'Phone, internet, communication' },
  { name: 'Professional Services', description: 'Consulting, legal, accounting' },
  { name: 'Other', description: 'Miscellaneous business expenses' }
];

async function setupDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    console.log('🔄 Synchronizing database schema...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Database schema synchronized');

    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

async function createDemoCompany() {
  try {
    console.log('🔄 Creating demo company...');

    // Check if demo company already exists
    const existingCompany = await Company.findOne({ where: { name: 'Demo Company' } });
    if (existingCompany) {
      console.log('ℹ️ Demo company already exists, skipping creation');
      return existingCompany;
    }

    // Create demo company
    const company = await Company.create({
      name: 'Demo Company',
      country: 'United States',
      currency: 'USD',
      timezone: 'America/New_York'
    });

    console.log('✅ Demo company created');
    return company;
  } catch (error) {
    console.error('❌ Failed to create demo company:', error);
    throw error;
  }
}

async function createDemoUsers(companyId) {
  try {
    console.log('🔄 Creating demo users...');

    // Check if demo admin already exists
    const existingAdmin = await User.findOne({ 
      where: { email: 'admin@demo.com', company_id: companyId } 
    });
    
    if (existingAdmin) {
      console.log('ℹ️ Demo users already exist, skipping creation');
      return;
    }

    // Create admin user
    const admin = await User.create({
      company_id: companyId,
      name: 'Admin User',
      email: 'admin@demo.com',
      password_hash: 'admin123', // Will be hashed by model hook
      role: 'admin'
    });

    // Create manager user
    const manager = await User.create({
      company_id: companyId,
      name: 'Manager User',
      email: 'manager@demo.com',
      password_hash: 'manager123', // Will be hashed by model hook
      role: 'manager',
      department: 'Finance',
      is_manager_approver: true
    });

    // Create employee user
    const employee = await User.create({
      company_id: companyId,
      name: 'Employee User',
      email: 'employee@demo.com',
      password_hash: 'employee123', // Will be hashed by model hook
      role: 'employee',
      manager_id: manager.id,
      department: 'Finance',
      employee_id: 'EMP001'
    });

    console.log('✅ Demo users created:');
    console.log('   👤 Admin: admin@demo.com / admin123');
    console.log('   👤 Manager: manager@demo.com / manager123');
    console.log('   👤 Employee: employee@demo.com / employee123');

    return { admin, manager, employee };
  } catch (error) {
    console.error('❌ Failed to create demo users:', error);
    throw error;
  }
}

async function createExpenseCategories(companyId) {
  try {
    console.log('🔄 Creating expense categories...');

    // Check if categories already exist
    const existingCategories = await ExpenseCategory.count({ where: { company_id: companyId } });
    if (existingCategories > 0) {
      console.log('ℹ️ Expense categories already exist, skipping creation');
      return;
    }

    // Create default categories
    const categories = await ExpenseCategory.bulkCreate(
      DEFAULT_CATEGORIES.map(category => ({
        ...category,
        company_id: companyId
      }))
    );

    console.log(`✅ Created ${categories.length} expense categories`);
    return categories;
  } catch (error) {
    console.error('❌ Failed to create expense categories:', error);
    throw error;
  }
}

async function createDefaultWorkflow(companyId, managerId) {
  try {
    console.log('🔄 Creating default approval workflow...');

    // Check if default workflow already exists
    const existingWorkflow = await ApprovalWorkflow.findOne({ 
      where: { company_id: companyId, is_default: true } 
    });
    
    if (existingWorkflow) {
      console.log('ℹ️ Default workflow already exists, skipping creation');
      return;
    }

    // Create default workflow
    const workflow = await ApprovalWorkflow.create({
      company_id: companyId,
      name: 'Standard Approval Workflow',
      description: 'Default approval workflow for all expenses',
      is_default: true,
      is_active: true
    });

    // Create workflow steps
    await ApprovalWorkflowStep.create({
      workflow_id: workflow.id,
      step_number: 1,
      step_name: 'Manager Approval',
      approver_type: 'manager',
      is_required: true,
      condition_amount_min: 0.01,
      auto_approve_threshold: 50.00 // Auto-approve expenses under $50
    });

    await ApprovalWorkflowStep.create({
      workflow_id: workflow.id,
      step_number: 2,
      step_name: 'Finance Approval',
      approver_type: 'specific_user',
      approver_id: managerId, // Use manager as finance approver for demo
      is_required: true,
      condition_amount_min: 500.00 // Only for expenses over $500
    });

    console.log('✅ Default approval workflow created');
    return workflow;
  } catch (error) {
    console.error('❌ Failed to create default workflow:', error);
    throw error;
  }
}

async function runSetup() {
  try {
    console.log('🚀 Starting expense-manager setup...\n');

    // Setup database
    await setupDatabase();
    console.log('');

    // Create demo data
    const company = await createDemoCompany();
    console.log('');

    const users = await createDemoUsers(company.id);
    console.log('');

    await createExpenseCategories(company.id);
    console.log('');

    if (users && users.manager) {
      await createDefaultWorkflow(company.id, users.manager.id);
      console.log('');
    }

    console.log('🎉 Setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Access the API at: http://localhost:3000');
    console.log('3. Use the demo credentials above to test the system');
    console.log('');
    console.log('📚 API Documentation: Check README.md for endpoint details');

  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run setup if called directly
if (require.main === module) {
  runSetup();
}

module.exports = {
  setupDatabase,
  createDemoCompany,
  createDemoUsers,
  createExpenseCategories,
  createDefaultWorkflow,
  runSetup
};