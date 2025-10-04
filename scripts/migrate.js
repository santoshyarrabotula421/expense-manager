const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const createDatabase = async (connection) => {
  const databaseName = process.env.DB_NAME || 'expense_manager';
  await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  await connection.execute(`USE \`${databaseName}\``);
  console.log(`✅ Database '${databaseName}' created/selected`);
};

const createTables = async (connection) => {
  const tables = [
    // Admins table
    `CREATE TABLE IF NOT EXISTS admins (
      id INT PRIMARY KEY AUTO_INCREMENT,
      company_name VARCHAR(255) NOT NULL UNIQUE,
      admin_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      INDEX idx_email (email),
      INDEX idx_company (company_name)
    )`,

    // Managers table
    `CREATE TABLE IF NOT EXISTS managers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      admin_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      department VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      UNIQUE KEY unique_manager_email_per_company (admin_id, email),
      INDEX idx_admin_id (admin_id),
      INDEX idx_email (email)
    )`,

    // Employees table
    `CREATE TABLE IF NOT EXISTS employees (
      id INT PRIMARY KEY AUTO_INCREMENT,
      admin_id INT NOT NULL,
      manager_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      department VARCHAR(255),
      position VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE,
      UNIQUE KEY unique_employee_email_per_company (admin_id, email),
      INDEX idx_admin_id (admin_id),
      INDEX idx_manager_id (manager_id),
      INDEX idx_email (email)
    )`,

    // Approval rules table
    `CREATE TABLE IF NOT EXISTS approval_rules (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      approver_type ENUM('manager', 'chief') NOT NULL,
      approver_id INT NOT NULL,
      sequence_order INT NOT NULL DEFAULT 1,
      threshold_percentage DECIMAL(5,2) DEFAULT 0.00,
      approval_description TEXT,
      is_chief BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      INDEX idx_employee_id (employee_id),
      INDEX idx_approver (approver_type, approver_id)
    )`,

    // Expense categories table
    `CREATE TABLE IF NOT EXISTS expense_categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      admin_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      UNIQUE KEY unique_category_per_company (admin_id, name),
      INDEX idx_admin_id (admin_id)
    )`,

    // Approval requests table (main expenses table)
    `CREATE TABLE IF NOT EXISTS approval_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      admin_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      converted_amount DECIMAL(15,2),
      conversion_rate DECIMAL(10,6),
      category_id INT,
      expense_date DATE NOT NULL,
      location VARCHAR(255),
      payment_method VARCHAR(100),
      remarks TEXT,
      attachment_path VARCHAR(500),
      status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft',
      current_approver_id INT,
      current_approver_type ENUM('manager', 'chief'),
      approval_sequence INT DEFAULT 1,
      submitted_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
      INDEX idx_employee_id (employee_id),
      INDEX idx_admin_id (admin_id),
      INDEX idx_status (status),
      INDEX idx_expense_date (expense_date),
      INDEX idx_current_approver (current_approver_type, current_approver_id)
    )`,

    // Approval history table
    `CREATE TABLE IF NOT EXISTS approval_history (
      id INT PRIMARY KEY AUTO_INCREMENT,
      request_id INT NOT NULL,
      approver_id INT NOT NULL,
      approver_type ENUM('manager', 'chief') NOT NULL,
      action ENUM('approved', 'rejected') NOT NULL,
      comments TEXT,
      approved_amount DECIMAL(15,2),
      sequence_order INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
      INDEX idx_request_id (request_id),
      INDEX idx_approver (approver_type, approver_id),
      INDEX idx_action (action)
    )`,

    // Currency rates table (for caching)
    `CREATE TABLE IF NOT EXISTS currency_rates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      base_currency VARCHAR(3) NOT NULL,
      target_currency VARCHAR(3) NOT NULL,
      rate DECIMAL(10,6) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_currency_pair (base_currency, target_currency),
      INDEX idx_currencies (base_currency, target_currency)
    )`,

    // Audit log table
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      user_type ENUM('admin', 'manager', 'employee') NOT NULL,
      action VARCHAR(255) NOT NULL,
      table_name VARCHAR(100),
      record_id INT,
      old_values JSON,
      new_values JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_type, user_id),
      INDEX idx_action (action),
      INDEX idx_created_at (created_at)
    )`
  ];

  for (const [index, tableSQL] of tables.entries()) {
    try {
      await connection.execute(tableSQL);
      console.log(`✅ Table ${index + 1}/9 created successfully`);
    } catch (error) {
      console.error(`❌ Error creating table ${index + 1}:`, error.message);
      throw error;
    }
  }
};

const insertDefaultData = async (connection) => {
  // Insert default expense categories
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

  // Insert default currency rates (USD as base)
  const defaultRates = [
    ['USD', 'EUR', 0.85],
    ['USD', 'GBP', 0.73],
    ['USD', 'JPY', 110.00],
    ['USD', 'CAD', 1.25],
    ['USD', 'AUD', 1.35],
    ['USD', 'INR', 74.50]
  ];

  try {
    // Insert currency rates
    for (const [base, target, rate] of defaultRates) {
      await connection.execute(
        'INSERT IGNORE INTO currency_rates (base_currency, target_currency, rate) VALUES (?, ?, ?)',
        [base, target, rate]
      );
    }
    console.log('✅ Default currency rates inserted');
  } catch (error) {
    console.error('❌ Error inserting default data:', error.message);
  }
};

const runMigration = async () => {
  let connection;
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Connect to MySQL (without selecting database)
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL server');

    // Create database
    await createDatabase(connection);

    // Create tables
    await createTables(connection);

    // Insert default data
    await insertDefaultData(connection);

    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };