const { getConnection } = require('../config/database');
const currencyService = require('../services/currencyService');

class EmployeeController {
  async getDashboard(req, res) {
    const connection = getConnection();
    
    try {
      const employeeId = req.user.id;

      // Get dashboard statistics
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
          COALESCE(SUM(CASE WHEN status = 'draft' THEN converted_amount END), 0) as draft_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN converted_amount END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN converted_amount END), 0) as approved_amount,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN converted_amount END), 0) as rejected_amount
        FROM approval_requests 
        WHERE employee_id = ?
      `, [employeeId]);

      // Get recent requests
      const [recentRequests] = await connection.execute(`
        SELECT 
          ar.id,
          ar.title,
          ar.amount,
          ar.currency,
          ar.status,
          ar.expense_date,
          ar.created_at,
          ec.name as category_name
        FROM approval_requests ar
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        WHERE ar.employee_id = ?
        ORDER BY ar.created_at DESC
        LIMIT 10
      `, [employeeId]);

      // Get monthly expense summary (last 6 months)
      const [monthlyExpenses] = await connection.execute(`
        SELECT 
          DATE_FORMAT(expense_date, '%Y-%m') as month,
          COUNT(*) as request_count,
          COALESCE(SUM(converted_amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN converted_amount ELSE 0 END), 0) as approved_amount
        FROM approval_requests 
        WHERE employee_id = ? 
          AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
        ORDER BY month DESC
      `, [employeeId]);

      res.json({
        statistics: stats[0],
        recentRequests,
        monthlyExpenses
      });

    } catch (error) {
      console.error('Employee dashboard error:', error);
      res.status(500).json({
        error: 'Failed to load dashboard',
        message: 'Internal server error while loading dashboard data'
      });
    }
  }

  async getExpenses(req, res) {
    const connection = getConnection();
    
    try {
      const employeeId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Build filters
      let whereClause = 'WHERE ar.employee_id = ?';
      let queryParams = [employeeId];

      if (req.query.status) {
        whereClause += ' AND ar.status = ?';
        queryParams.push(req.query.status);
      }

      if (req.query.category_id) {
        whereClause += ' AND ar.category_id = ?';
        queryParams.push(req.query.category_id);
      }

      if (req.query.date_from) {
        whereClause += ' AND ar.expense_date >= ?';
        queryParams.push(req.query.date_from);
      }

      if (req.query.date_to) {
        whereClause += ' AND ar.expense_date <= ?';
        queryParams.push(req.query.date_to);
      }

      if (req.query.amount_min) {
        whereClause += ' AND ar.converted_amount >= ?';
        queryParams.push(req.query.amount_min);
      }

      if (req.query.amount_max) {
        whereClause += ' AND ar.converted_amount <= ?';
        queryParams.push(req.query.amount_max);
      }

      // Get expenses
      const [expenses] = await connection.execute(`
        SELECT 
          ar.id,
          ar.title,
          ar.description,
          ar.amount,
          ar.currency,
          ar.converted_amount,
          ar.conversion_rate,
          ar.expense_date,
          ar.location,
          ar.payment_method,
          ar.remarks,
          ar.status,
          ar.attachment_path,
          ar.created_at,
          ar.submitted_at,
          ec.name as category_name,
          -- Get current approver info
          CASE 
            WHEN ar.current_approver_type = 'manager' THEN 
              (SELECT name FROM managers WHERE id = ar.current_approver_id)
            WHEN ar.current_approver_type = 'chief' THEN 
              (SELECT name FROM employees WHERE id = ar.current_approver_id)
            ELSE NULL
          END as current_approver_name,
          ar.current_approver_type,
          -- Get approval history
          (SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'approver_type', ah.approver_type,
              'approver_name', CASE 
                WHEN ah.approver_type = 'manager' THEN (SELECT name FROM managers WHERE id = ah.approver_id)
                WHEN ah.approver_type = 'chief' THEN (SELECT name FROM employees WHERE id = ah.approver_id)
              END,
              'action', ah.action,
              'comments', ah.comments,
              'approved_amount', ah.approved_amount,
              'created_at', ah.created_at
            )
          ) FROM approval_history ah WHERE ah.request_id = ar.id ORDER BY ah.sequence_order) as approval_history
        FROM approval_requests ar
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        ${whereClause}
        ORDER BY ar.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, limit, offset]);

      // Get total count
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM approval_requests ar
        ${whereClause}
      `, queryParams);

      // Parse approval_history JSON for each expense
      const processedExpenses = expenses.map(expense => ({
        ...expense,
        approval_history: expense.approval_history ? JSON.parse(expense.approval_history) : []
      }));

      res.json({
        expenses: processedExpenses,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({
        error: 'Failed to fetch expenses',
        message: 'Internal server error while fetching expenses'
      });
    }
  }

  async createExpense(req, res) {
    const connection = getConnection();
    
    try {
      const employeeId = req.user.id;
      const adminId = req.user.admin_id;
      const {
        title,
        description,
        amount,
        currency = 'USD',
        category_id,
        expense_date,
        location,
        payment_method,
        remarks,
        submit_for_approval = false
      } = req.body;

      // Convert currency if needed
      let convertedAmount = amount;
      let conversionRate = 1;

      if (currency !== 'USD') {
        try {
          const conversion = await currencyService.convertAmount(amount, currency, 'USD');
          convertedAmount = conversion.convertedAmount;
          conversionRate = conversion.exchangeRate;
        } catch (error) {
          console.warn('Currency conversion failed, using original amount:', error.message);
        }
      }

      // Determine initial status and approval flow
      let status = submit_for_approval ? 'pending' : 'draft';
      let currentApproverId = null;
      let currentApproverType = null;
      let approvalSequence = 1;
      let submittedAt = null;

      if (submit_for_approval) {
        // Get first approver from approval rules
        const [firstApprover] = await connection.execute(`
          SELECT approver_id, approver_type, sequence_order
          FROM approval_rules 
          WHERE employee_id = ?
          ORDER BY sequence_order ASC
          LIMIT 1
        `, [employeeId]);

        if (firstApprover.length > 0) {
          currentApproverId = firstApprover[0].approver_id;
          currentApproverType = firstApprover[0].approver_type;
          approvalSequence = firstApprover[0].sequence_order;
          submittedAt = new Date();
        } else {
          return res.status(400).json({
            error: 'No approval workflow configured',
            message: 'Please contact your administrator to set up approval workflow'
          });
        }
      }

      // Create expense request
      const [result] = await connection.execute(`
        INSERT INTO approval_requests (
          employee_id, admin_id, title, description, amount, currency, 
          converted_amount, conversion_rate, category_id, expense_date, 
          location, payment_method, remarks, status, current_approver_id, 
          current_approver_type, approval_sequence, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId, adminId, title, description, amount, currency,
        convertedAmount, conversionRate, category_id, expense_date,
        location, payment_method, remarks, status, currentApproverId,
        currentApproverType, approvalSequence, submittedAt
      ]);

      // Get created expense with category info
      const [expense] = await connection.execute(`
        SELECT 
          ar.*,
          ec.name as category_name
        FROM approval_requests ar
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        WHERE ar.id = ?
      `, [result.insertId]);

      res.status(201).json({
        message: submit_for_approval ? 'Expense submitted for approval' : 'Expense saved as draft',
        expense: expense[0]
      });

    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({
        error: 'Failed to create expense',
        message: 'Internal server error while creating expense'
      });
    }
  }

  async updateExpense(req, res) {
    const connection = getConnection();
    
    try {
      const employeeId = req.user.id;
      const expenseId = req.params.id;
      const {
        title,
        description,
        amount,
        currency,
        category_id,
        expense_date,
        location,
        payment_method,
        remarks,
        submit_for_approval = false
      } = req.body;

      // Verify expense belongs to employee and is editable
      const [existingExpense] = await connection.execute(
        'SELECT id, status, currency, amount FROM approval_requests WHERE id = ? AND employee_id = ?',
        [expenseId, employeeId]
      );

      if (existingExpense.length === 0) {
        return res.status(404).json({
          error: 'Expense not found',
          message: 'Expense not found or does not belong to you'
        });
      }

      const currentExpense = existingExpense[0];

      if (currentExpense.status !== 'draft' && currentExpense.status !== 'rejected') {
        return res.status(400).json({
          error: 'Cannot edit expense',
          message: 'Only draft or rejected expenses can be edited'
        });
      }

      // Handle currency conversion if amount or currency changed
      let convertedAmount = amount;
      let conversionRate = 1;

      if (currency && currency !== 'USD' && (amount !== currentExpense.amount || currency !== currentExpense.currency)) {
        try {
          const conversion = await currencyService.convertAmount(amount, currency, 'USD');
          convertedAmount = conversion.convertedAmount;
          conversionRate = conversion.exchangeRate;
        } catch (error) {
          console.warn('Currency conversion failed, using original amount:', error.message);
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];

      if (title) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (description) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (amount) {
        updateFields.push('amount = ?');
        updateValues.push(amount);
        updateFields.push('converted_amount = ?');
        updateValues.push(convertedAmount);
        updateFields.push('conversion_rate = ?');
        updateValues.push(conversionRate);
      }
      if (currency) {
        updateFields.push('currency = ?');
        updateValues.push(currency);
      }
      if (category_id !== undefined) {
        updateFields.push('category_id = ?');
        updateValues.push(category_id);
      }
      if (expense_date) {
        updateFields.push('expense_date = ?');
        updateValues.push(expense_date);
      }
      if (location !== undefined) {
        updateFields.push('location = ?');
        updateValues.push(location);
      }
      if (payment_method !== undefined) {
        updateFields.push('payment_method = ?');
        updateValues.push(payment_method);
      }
      if (remarks !== undefined) {
        updateFields.push('remarks = ?');
        updateValues.push(remarks);
      }

      // Handle submission for approval
      if (submit_for_approval && currentExpense.status === 'draft') {
        // Get first approver
        const [firstApprover] = await connection.execute(`
          SELECT approver_id, approver_type, sequence_order
          FROM approval_rules 
          WHERE employee_id = ?
          ORDER BY sequence_order ASC
          LIMIT 1
        `, [employeeId]);

        if (firstApprover.length > 0) {
          updateFields.push('status = ?');
          updateValues.push('pending');
          updateFields.push('current_approver_id = ?');
          updateValues.push(firstApprover[0].approver_id);
          updateFields.push('current_approver_type = ?');
          updateValues.push(firstApprover[0].approver_type);
          updateFields.push('approval_sequence = ?');
          updateValues.push(firstApprover[0].sequence_order);
          updateFields.push('submitted_at = NOW()');
        } else {
          return res.status(400).json({
            error: 'No approval workflow configured',
            message: 'Please contact your administrator to set up approval workflow'
          });
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'No updates provided',
          message: 'Please provide at least one field to update'
        });
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(expenseId);

      await connection.execute(
        `UPDATE approval_requests SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated expense
      const [updatedExpense] = await connection.execute(`
        SELECT 
          ar.*,
          ec.name as category_name
        FROM approval_requests ar
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        WHERE ar.id = ?
      `, [expenseId]);

      res.json({
        message: 'Expense updated successfully',
        expense: updatedExpense[0]
      });

    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({
        error: 'Failed to update expense',
        message: 'Internal server error while updating expense'
      });
    }
  }

  async deleteExpense(req, res) {
    const connection = getConnection();
    
    try {
      const employeeId = req.user.id;
      const expenseId = req.params.id;

      // Verify expense belongs to employee and is deletable
      const [result] = await connection.execute(
        'DELETE FROM approval_requests WHERE id = ? AND employee_id = ? AND status IN (?, ?)',
        [expenseId, employeeId, 'draft', 'rejected']
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Cannot delete expense',
          message: 'Expense not found or cannot be deleted (only draft or rejected expenses can be deleted)'
        });
      }

      res.json({
        message: 'Expense deleted successfully'
      });

    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({
        error: 'Failed to delete expense',
        message: 'Internal server error while deleting expense'
      });
    }
  }

  async getExpenseById(req, res) {
    const connection = getConnection();
    
    try {
      const employeeId = req.user.id;
      const expenseId = req.params.id;

      const [expenses] = await connection.execute(`
        SELECT 
          ar.*,
          ec.name as category_name,
          -- Get current approver info
          CASE 
            WHEN ar.current_approver_type = 'manager' THEN 
              (SELECT name FROM managers WHERE id = ar.current_approver_id)
            WHEN ar.current_approver_type = 'chief' THEN 
              (SELECT name FROM employees WHERE id = ar.current_approver_id)
            ELSE NULL
          END as current_approver_name,
          -- Get approval history
          (SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'approver_type', ah.approver_type,
              'approver_name', CASE 
                WHEN ah.approver_type = 'manager' THEN (SELECT name FROM managers WHERE id = ah.approver_id)
                WHEN ah.approver_type = 'chief' THEN (SELECT name FROM employees WHERE id = ah.approver_id)
              END,
              'action', ah.action,
              'comments', ah.comments,
              'approved_amount', ah.approved_amount,
              'created_at', ah.created_at
            )
          ) FROM approval_history ah WHERE ah.request_id = ar.id ORDER BY ah.sequence_order) as approval_history
        FROM approval_requests ar
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        WHERE ar.id = ? AND ar.employee_id = ?
      `, [expenseId, employeeId]);

      if (expenses.length === 0) {
        return res.status(404).json({
          error: 'Expense not found',
          message: 'Expense not found or does not belong to you'
        });
      }

      const expense = {
        ...expenses[0],
        approval_history: expenses[0].approval_history ? JSON.parse(expenses[0].approval_history) : []
      };

      res.json({ expense });

    } catch (error) {
      console.error('Get expense by ID error:', error);
      res.status(500).json({
        error: 'Failed to fetch expense',
        message: 'Internal server error while fetching expense'
      });
    }
  }

  async submitExpense(req, res) {
    const connection = getConnection();
    
    try {
      const employeeId = req.user.id;
      const expenseId = req.params.id;

      // Verify expense is in draft status
      const [expense] = await connection.execute(
        'SELECT id, status FROM approval_requests WHERE id = ? AND employee_id = ? AND status = ?',
        [expenseId, employeeId, 'draft']
      );

      if (expense.length === 0) {
        return res.status(404).json({
          error: 'Cannot submit expense',
          message: 'Expense not found or not in draft status'
        });
      }

      // Get first approver
      const [firstApprover] = await connection.execute(`
        SELECT approver_id, approver_type, sequence_order
        FROM approval_rules 
        WHERE employee_id = ?
        ORDER BY sequence_order ASC
        LIMIT 1
      `, [employeeId]);

      if (firstApprover.length === 0) {
        return res.status(400).json({
          error: 'No approval workflow configured',
          message: 'Please contact your administrator to set up approval workflow'
        });
      }

      // Update expense to pending status
      await connection.execute(`
        UPDATE approval_requests 
        SET status = ?, current_approver_id = ?, current_approver_type = ?, 
            approval_sequence = ?, submitted_at = NOW()
        WHERE id = ?
      `, ['pending', firstApprover[0].approver_id, firstApprover[0].approver_type, firstApprover[0].sequence_order, expenseId]);

      res.json({
        message: 'Expense submitted for approval successfully'
      });

    } catch (error) {
      console.error('Submit expense error:', error);
      res.status(500).json({
        error: 'Failed to submit expense',
        message: 'Internal server error while submitting expense'
      });
    }
  }
}

module.exports = new EmployeeController();