const { getConnection } = require('../config/database');

class ManagerController {
  async getDashboard(req, res) {
    const connection = getConnection();
    
    try {
      const managerId = req.user.id;

      // Get dashboard statistics
      const [stats] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM employees WHERE manager_id = ? AND is_active = 1) as total_employees,
          (SELECT COUNT(*) FROM approval_requests ar 
           JOIN employees e ON ar.employee_id = e.id 
           WHERE e.manager_id = ? AND ar.status = 'pending' 
           AND (ar.current_approver_type = 'manager' AND ar.current_approver_id = ?)) as pending_approvals,
          (SELECT COUNT(*) FROM approval_history ah 
           WHERE ah.approver_type = 'manager' AND ah.approver_id = ?) as total_processed,
          (SELECT COUNT(*) FROM approval_history ah 
           WHERE ah.approver_type = 'manager' AND ah.approver_id = ? AND ah.action = 'approved') as total_approved,
          (SELECT COUNT(*) FROM approval_history ah 
           WHERE ah.approver_type = 'manager' AND ah.approver_id = ? AND ah.action = 'rejected') as total_rejected,
          (SELECT COALESCE(SUM(ar.converted_amount), 0) FROM approval_requests ar 
           JOIN employees e ON ar.employee_id = e.id 
           WHERE e.manager_id = ? AND ar.status = 'approved') as total_approved_amount
      `, [managerId, managerId, managerId, managerId, managerId, managerId, managerId]);

      // Get recent approval activity
      const [recentActivity] = await connection.execute(`
        SELECT 
          ah.id,
          ah.action,
          ah.comments,
          ah.approved_amount,
          ah.created_at,
          ar.title,
          ar.amount,
          ar.currency,
          e.name as employee_name
        FROM approval_history ah
        JOIN approval_requests ar ON ah.request_id = ar.id
        JOIN employees e ON ar.employee_id = e.id
        WHERE ah.approver_type = 'manager' AND ah.approver_id = ?
        ORDER BY ah.created_at DESC
        LIMIT 10
      `, [managerId]);

      // Get pending requests requiring manager approval
      const [pendingRequests] = await connection.execute(`
        SELECT 
          ar.id,
          ar.title,
          ar.amount,
          ar.currency,
          ar.status,
          ar.expense_date,
          ar.created_at,
          e.name as employee_name,
          ec.name as category_name
        FROM approval_requests ar
        JOIN employees e ON ar.employee_id = e.id
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        WHERE e.manager_id = ? 
          AND ar.status = 'pending'
          AND ar.current_approver_type = 'manager' 
          AND ar.current_approver_id = ?
        ORDER BY ar.created_at ASC
        LIMIT 5
      `, [managerId, managerId]);

      res.json({
        statistics: stats[0],
        recentActivity,
        pendingRequests
      });

    } catch (error) {
      console.error('Manager dashboard error:', error);
      res.status(500).json({
        error: 'Failed to load dashboard',
        message: 'Internal server error while loading dashboard data'
      });
    }
  }

  async getApprovalQueue(req, res) {
    const connection = getConnection();
    
    try {
      const managerId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status || 'pending';

      let whereClause = 'WHERE e.manager_id = ?';
      let queryParams = [managerId];

      if (status === 'pending') {
        whereClause += ' AND ar.status = ? AND ar.current_approver_type = ? AND ar.current_approver_id = ?';
        queryParams.push('pending', 'manager', managerId);
      } else {
        // Show requests that have been processed by this manager
        whereClause += ` AND ar.id IN (
          SELECT ah.request_id FROM approval_history ah 
          WHERE ah.approver_type = 'manager' AND ah.approver_id = ?
        )`;
        queryParams.push(managerId);
      }

      // Get approval requests
      const [requests] = await connection.execute(`
        SELECT 
          ar.id,
          ar.title,
          ar.description,
          ar.amount,
          ar.currency,
          ar.converted_amount,
          ar.expense_date,
          ar.location,
          ar.payment_method,
          ar.remarks,
          ar.status,
          ar.created_at,
          ar.submitted_at,
          e.name as employee_name,
          e.email as employee_email,
          ec.name as category_name,
          -- Get approval rule for this request
          (SELECT approval_description FROM approval_rules 
           WHERE employee_id = ar.employee_id 
           AND approver_type = 'manager' 
           AND approver_id = ? 
           LIMIT 1) as approval_description,
          -- Get any existing approval history for this request by this manager
          (SELECT JSON_OBJECT(
             'action', ah.action,
             'comments', ah.comments,
             'approved_amount', ah.approved_amount,
             'created_at', ah.created_at
           ) FROM approval_history ah 
           WHERE ah.request_id = ar.id 
           AND ah.approver_type = 'manager' 
           AND ah.approver_id = ?
           LIMIT 1) as approval_history
        FROM approval_requests ar
        JOIN employees e ON ar.employee_id = e.id
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        ${whereClause}
        ORDER BY ar.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, managerId, managerId, limit, offset]);

      // Get total count
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM approval_requests ar
        JOIN employees e ON ar.employee_id = e.id
        ${whereClause}
      `, queryParams);

      // Parse approval_history JSON for each request
      const processedRequests = requests.map(request => ({
        ...request,
        approval_history: request.approval_history ? JSON.parse(request.approval_history) : null
      }));

      res.json({
        requests: processedRequests,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Get approval queue error:', error);
      res.status(500).json({
        error: 'Failed to fetch approval queue',
        message: 'Internal server error while fetching approval queue'
      });
    }
  }

  async processApproval(req, res) {
    const connection = getConnection();
    
    try {
      const managerId = req.user.id;
      const requestId = req.params.id;
      const { action, comments, approved_amount } = req.body;

      await connection.beginTransaction();

      try {
        // Get the request and verify it's pending and assigned to this manager
        const [requests] = await connection.execute(`
          SELECT 
            ar.*,
            e.name as employee_name,
            e.admin_id
          FROM approval_requests ar
          JOIN employees e ON ar.employee_id = e.id
          WHERE ar.id = ? 
            AND e.manager_id = ? 
            AND ar.status = 'pending'
            AND ar.current_approver_type = 'manager'
            AND ar.current_approver_id = ?
        `, [requestId, managerId, managerId]);

        if (requests.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            error: 'Request not found',
            message: 'Request not found or not assigned to you for approval'
          });
        }

        const request = requests[0];
        const finalApprovedAmount = approved_amount || request.converted_amount || request.amount;

        // Record approval history
        await connection.execute(`
          INSERT INTO approval_history (request_id, approver_id, approver_type, action, comments, approved_amount, sequence_order)
          VALUES (?, ?, 'manager', ?, ?, ?, ?)
        `, [requestId, managerId, action, comments, finalApprovedAmount, request.approval_sequence]);

        if (action === 'rejected') {
          // If rejected, update request status to rejected
          await connection.execute(
            'UPDATE approval_requests SET status = ?, current_approver_id = NULL, current_approver_type = NULL WHERE id = ?',
            ['rejected', requestId]
          );
        } else {
          // If approved, check if there are more approvers in sequence
          const [nextApprover] = await connection.execute(`
            SELECT approver_id, approver_type, sequence_order, threshold_percentage
            FROM approval_rules 
            WHERE employee_id = ? 
              AND sequence_order > ?
            ORDER BY sequence_order ASC
            LIMIT 1
          `, [request.employee_id, request.approval_sequence]);

          if (nextApprover.length > 0) {
            // Check if threshold is met for automatic approval
            const thresholdAmount = (request.converted_amount || request.amount) * (nextApprover[0].threshold_percentage / 100);
            
            if (finalApprovedAmount <= thresholdAmount) {
              // Automatic approval - skip to next approver or complete
              const [subsequentApprover] = await connection.execute(`
                SELECT approver_id, approver_type, sequence_order
                FROM approval_rules 
                WHERE employee_id = ? 
                  AND sequence_order > ?
                ORDER BY sequence_order ASC
                LIMIT 1
              `, [request.employee_id, nextApprover[0].sequence_order]);

              if (subsequentApprover.length > 0) {
                // Move to next approver
                await connection.execute(`
                  UPDATE approval_requests 
                  SET current_approver_id = ?, current_approver_type = ?, approval_sequence = ?
                  WHERE id = ?
                `, [subsequentApprover[0].approver_id, subsequentApprover[0].approver_type, subsequentApprover[0].sequence_order, requestId]);
              } else {
                // No more approvers - fully approved
                await connection.execute(
                  'UPDATE approval_requests SET status = ?, current_approver_id = NULL, current_approver_type = NULL WHERE id = ?',
                  ['approved', requestId]
                );
              }
            } else {
              // Move to next approver (chief)
              await connection.execute(`
                UPDATE approval_requests 
                SET current_approver_id = ?, current_approver_type = ?, approval_sequence = ?
                WHERE id = ?
              `, [nextApprover[0].approver_id, nextApprover[0].approver_type, nextApprover[0].sequence_order, requestId]);
            }
          } else {
            // No more approvers - fully approved
            await connection.execute(
              'UPDATE approval_requests SET status = ?, current_approver_id = NULL, current_approver_type = NULL WHERE id = ?',
              ['approved', requestId]
            );
          }
        }

        await connection.commit();

        res.json({
          message: `Request ${action} successfully`,
          requestId: requestId,
          action: action
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Process approval error:', error);
      res.status(500).json({
        error: 'Failed to process approval',
        message: 'Internal server error while processing approval'
      });
    }
  }

  async getApprovalHistory(req, res) {
    const connection = getConnection();
    
    try {
      const managerId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get approval history
      const [history] = await connection.execute(`
        SELECT 
          ah.id,
          ah.action,
          ah.comments,
          ah.approved_amount,
          ah.created_at,
          ar.id as request_id,
          ar.title,
          ar.amount,
          ar.currency,
          ar.expense_date,
          ar.status as current_status,
          e.name as employee_name,
          ec.name as category_name
        FROM approval_history ah
        JOIN approval_requests ar ON ah.request_id = ar.id
        JOIN employees e ON ar.employee_id = e.id
        LEFT JOIN expense_categories ec ON ar.category_id = ec.id
        WHERE ah.approver_type = 'manager' AND ah.approver_id = ?
        ORDER BY ah.created_at DESC
        LIMIT ? OFFSET ?
      `, [managerId, limit, offset]);

      // Get total count
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM approval_history WHERE approver_type = ? AND approver_id = ?',
        ['manager', managerId]
      );

      res.json({
        history,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });

    } catch (error) {
      console.error('Get approval history error:', error);
      res.status(500).json({
        error: 'Failed to fetch approval history',
        message: 'Internal server error while fetching approval history'
      });
    }
  }

  async getMyEmployees(req, res) {
    const connection = getConnection();
    
    try {
      const managerId = req.user.id;

      // Get employees managed by this manager
      const [employees] = await connection.execute(`
        SELECT 
          e.id,
          e.name,
          e.email,
          e.department,
          e.position,
          e.is_active,
          e.created_at,
          COUNT(ar.id) as total_requests,
          COUNT(CASE WHEN ar.status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN ar.status = 'approved' THEN 1 END) as approved_requests,
          COALESCE(SUM(CASE WHEN ar.status = 'approved' THEN ar.converted_amount END), 0) as total_approved_amount
        FROM employees e
        LEFT JOIN approval_requests ar ON e.id = ar.employee_id
        WHERE e.manager_id = ? AND e.is_active = 1
        GROUP BY e.id, e.name, e.email, e.department, e.position, e.is_active, e.created_at
        ORDER BY e.name
      `, [managerId]);

      res.json({ employees });

    } catch (error) {
      console.error('Get my employees error:', error);
      res.status(500).json({
        error: 'Failed to fetch employees',
        message: 'Internal server error while fetching employees'
      });
    }
  }
}

module.exports = new ManagerController();