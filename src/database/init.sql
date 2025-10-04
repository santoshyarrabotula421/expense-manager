-- Expense Management System Database Schema
-- Multi-Level Approval Workflow Design

-- 1. Companies Table
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_company_name (name)
);

-- 2. Users Table (Employees, Managers, Admins)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
    manager_id INT NULL, -- Direct manager
    is_manager_approver BOOLEAN DEFAULT FALSE, -- Whether manager approval is required
    department VARCHAR(100),
    employee_id VARCHAR(50), -- Company's internal employee ID
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_email_company (email, company_id),
    INDEX idx_user_company (company_id),
    INDEX idx_user_manager (manager_id),
    INDEX idx_user_role (role)
);

-- 3. Expense Categories
CREATE TABLE expense_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY uk_category_name_company (name, company_id),
    INDEX idx_category_company (company_id)
);

-- 4. Approval Workflows (Templates for approval processes)
CREATE TABLE approval_workflows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_workflow_company (company_id)
);

-- 5. Approval Workflow Steps (Define the approval sequence)
CREATE TABLE approval_workflow_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workflow_id INT NOT NULL,
    step_number INT NOT NULL, -- Order of approval (1, 2, 3...)
    step_name VARCHAR(255) NOT NULL,
    approver_type ENUM('specific_user', 'role', 'manager', 'department_head', 'finance', 'cfo') NOT NULL,
    approver_id INT NULL, -- Specific user ID if approver_type is 'specific_user'
    approver_role VARCHAR(100) NULL, -- Role name if approver_type is 'role'
    is_required BOOLEAN DEFAULT TRUE,
    condition_amount_min DECIMAL(15,2) DEFAULT 0.00,
    condition_amount_max DECIMAL(15,2) DEFAULT NULL,
    condition_category_ids JSON NULL, -- Array of category IDs this step applies to
    auto_approve_threshold DECIMAL(15,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_workflow_steps (workflow_id, step_number),
    INDEX idx_approver (approver_id)
);

-- 6. Approval Rules (Conditional approval logic)
CREATE TABLE approval_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    workflow_id INT NULL, -- NULL means global rule
    name VARCHAR(255) NOT NULL,
    rule_type ENUM('percentage', 'specific_approver', 'hybrid', 'threshold', 'category') NOT NULL,
    condition_field VARCHAR(100), -- 'amount', 'category', 'department'
    condition_operator ENUM('>', '>=', '<', '<=', '=', 'IN', 'NOT IN') NOT NULL,
    condition_value JSON NOT NULL, -- Value to compare against
    action_type ENUM('auto_approve', 'require_approval', 'skip_step', 'add_approver') NOT NULL,
    action_value JSON NULL, -- Additional parameters for the action
    percentage_threshold INT DEFAULT NULL, -- For percentage rules (0-100)
    specific_approver_id INT DEFAULT NULL, -- For specific approver rules
    priority INT DEFAULT 0, -- Higher priority rules execute first
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (specific_approver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_rule_company (company_id),
    INDEX idx_rule_workflow (workflow_id),
    INDEX idx_rule_priority (priority DESC)
);

-- 7. Expenses Table
CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    company_id INT NOT NULL,
    workflow_id INT NULL, -- Which workflow is being used
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    amount_in_company_currency DECIMAL(15,2) NOT NULL, -- Converted amount
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    category_id INT NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url VARCHAR(500),
    receipt_data JSON NULL, -- OCR extracted data
    status ENUM('draft', 'submitted', 'in_approval', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'draft',
    current_approval_step INT DEFAULT 0, -- Current step in approval workflow
    submitted_at TIMESTAMP NULL,
    approved_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE SET NULL,
    INDEX idx_expense_user (user_id),
    INDEX idx_expense_company (company_id),
    INDEX idx_expense_status (status),
    INDEX idx_expense_date (expense_date),
    INDEX idx_expense_workflow (workflow_id)
);

-- 8. Approval Steps (Actual approval instances for each expense)
CREATE TABLE approval_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_id INT NOT NULL,
    workflow_step_id INT NULL, -- Reference to the template step
    step_number INT NOT NULL,
    approver_id INT NOT NULL,
    approver_type VARCHAR(50) NOT NULL, -- 'manager', 'finance', 'cfo', etc.
    status ENUM('pending', 'approved', 'rejected', 'skipped') NOT NULL DEFAULT 'pending',
    comments TEXT NULL,
    approved_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL,
    notified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_step_id) REFERENCES approval_workflow_steps(id) ON DELETE SET NULL,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_expense_step_approver (expense_id, step_number, approver_id),
    INDEX idx_approval_expense (expense_id),
    INDEX idx_approval_approver (approver_id),
    INDEX idx_approval_status (status)
);

-- 9. Approval History (Audit trail)
CREATE TABLE approval_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_id INT NOT NULL,
    user_id INT NOT NULL, -- Who performed the action
    action ENUM('submitted', 'approved', 'rejected', 'assigned', 'reassigned', 'escalated', 'auto_approved') NOT NULL,
    step_number INT NULL,
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    comments TEXT NULL,
    metadata JSON NULL, -- Additional context data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_history_expense (expense_id),
    INDEX idx_history_user (user_id),
    INDEX idx_history_action (action)
);

-- 10. Notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    expense_id INT NULL,
    type ENUM('approval_request', 'approved', 'rejected', 'escalated', 'reminder') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    INDEX idx_notification_user (user_id),
    INDEX idx_notification_read (is_read),
    INDEX idx_notification_type (type)
);

-- Trigger to update expense status when all approvals are complete
DELIMITER //
CREATE TRIGGER update_expense_status_after_approval
AFTER UPDATE ON approval_steps
FOR EACH ROW
BEGIN
    DECLARE total_steps INT DEFAULT 0;
    DECLARE approved_steps INT DEFAULT 0;
    DECLARE rejected_steps INT DEFAULT 0;
    DECLARE pending_steps INT DEFAULT 0;

    -- Count approval steps for this expense
    SELECT 
        COUNT(*) INTO total_steps
    FROM approval_steps 
    WHERE expense_id = NEW.expense_id;

    SELECT 
        COUNT(*) INTO approved_steps
    FROM approval_steps 
    WHERE expense_id = NEW.expense_id AND status = 'approved';

    SELECT 
        COUNT(*) INTO rejected_steps
    FROM approval_steps 
    WHERE expense_id = NEW.expense_id AND status = 'rejected';

    SELECT 
        COUNT(*) INTO pending_steps
    FROM approval_steps 
    WHERE expense_id = NEW.expense_id AND status = 'pending';

    -- Update expense status based on approval results
    IF rejected_steps > 0 THEN
        UPDATE expenses 
        SET status = 'rejected', rejected_at = NOW() 
        WHERE id = NEW.expense_id;
    ELSEIF approved_steps = total_steps THEN
        UPDATE expenses 
        SET status = 'approved', approved_at = NOW() 
        WHERE id = NEW.expense_id;
    ELSEIF pending_steps > 0 THEN
        UPDATE expenses 
        SET status = 'in_approval', current_approval_step = (
            SELECT MIN(step_number) 
            FROM approval_steps 
            WHERE expense_id = NEW.expense_id AND status = 'pending'
        )
        WHERE id = NEW.expense_id;
    END IF;
END //
DELIMITER ;

-- Trigger to create approval history entries
DELIMITER //
CREATE TRIGGER create_approval_history
AFTER UPDATE ON approval_steps
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO approval_history (
            expense_id, user_id, action, step_number, 
            previous_status, new_status, comments, created_at
        ) VALUES (
            NEW.expense_id, NEW.approver_id, 
            CASE NEW.status 
                WHEN 'approved' THEN 'approved'
                WHEN 'rejected' THEN 'rejected'
                ELSE 'assigned'
            END,
            NEW.step_number, OLD.status, NEW.status, 
            NEW.comments, NOW()
        );
    END IF;
END //
DELIMITER ;

-- Insert default expense categories for new companies
INSERT INTO expense_categories (company_id, name, description) VALUES
(1, 'Travel', 'Transportation, flights, car rentals'),
(1, 'Meals', 'Business meals and entertainment'),
(1, 'Accommodation', 'Hotels and lodging'),
(1, 'Office Supplies', 'Stationery, equipment, software'),
(1, 'Training', 'Courses, conferences, certifications'),
(1, 'Marketing', 'Advertising, promotional materials'),
(1, 'Equipment', 'Hardware, tools, machinery'),
(1, 'Telecommunications', 'Phone, internet, communication'),
(1, 'Professional Services', 'Consulting, legal, accounting'),
(1, 'Other', 'Miscellaneous business expenses');