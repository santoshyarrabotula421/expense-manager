const express = require('express');
const router = express.Router();

const { getConnection } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateId, validateApprovalRules } = require('../middleware/validation');

// Apply authentication to all routes
router.use(authenticateToken);

// Get expense categories (available to all authenticated users)
router.get('/categories', async (req, res) => {
  const connection = getConnection();
  
  try {
    const adminId = req.user.admin_id;

    const [categories] = await connection.execute(
      'SELECT id, name, description FROM expense_categories WHERE admin_id = ? AND is_active = 1 ORDER BY name',
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
});

// Get approval rules for an employee (admin only)
router.get('/approval-rules/:employeeId', 
  authorizeRoles('admin'), 
  validateId, 
  async (req, res) => {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const employeeId = req.params.employeeId;

      // Verify employee belongs to this admin
      const [employee] = await connection.execute(
        'SELECT id FROM employees WHERE id = ? AND admin_id = ?',
        [employeeId, adminId]
      );

      if (employee.length === 0) {
        return res.status(404).json({
          error: 'Employee not found',
          message: 'Employee not found or does not belong to your company'
        });
      }

      // Get approval rules
      const [rules] = await connection.execute(`
        SELECT 
          ar.id,
          ar.approver_type,
          ar.approver_id,
          ar.sequence_order,
          ar.threshold_percentage,
          ar.approval_description,
          ar.is_chief,
          CASE 
            WHEN ar.approver_type = 'manager' THEN m.name
            WHEN ar.approver_type = 'chief' THEN e.name
          END as approver_name
        FROM approval_rules ar
        LEFT JOIN managers m ON ar.approver_type = 'manager' AND ar.approver_id = m.id
        LEFT JOIN employees e ON ar.approver_type = 'chief' AND ar.approver_id = e.id
        WHERE ar.employee_id = ?
        ORDER BY ar.sequence_order
      `, [employeeId]);

      res.json({ approvalRules: rules });

    } catch (error) {
      console.error('Get approval rules error:', error);
      res.status(500).json({
        error: 'Failed to fetch approval rules',
        message: 'Internal server error while fetching approval rules'
      });
    }
  }
);

// Set approval rules for an employee (admin only)
router.post('/approval-rules/:employeeId', 
  authorizeRoles('admin'), 
  validateId, 
  validateApprovalRules,
  async (req, res) => {
    const connection = getConnection();
    
    try {
      const adminId = req.user.id;
      const employeeId = req.params.employeeId;
      const { approvers } = req.body;

      await connection.beginTransaction();

      try {
        // Verify employee belongs to this admin
        const [employee] = await connection.execute(
          'SELECT id FROM employees WHERE id = ? AND admin_id = ?',
          [employeeId, adminId]
        );

        if (employee.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            error: 'Employee not found',
            message: 'Employee not found or does not belong to your company'
          });
        }

        // Verify all approvers exist and belong to this company
        for (const approver of approvers) {
          if (approver.approver_type === 'manager') {
            const [manager] = await connection.execute(
              'SELECT id FROM managers WHERE id = ? AND admin_id = ?',
              [approver.approver_id, adminId]
            );
            if (manager.length === 0) {
              await connection.rollback();
              return res.status(400).json({
                error: 'Invalid approver',
                message: `Manager with ID ${approver.approver_id} not found`
              });
            }
          } else if (approver.approver_type === 'chief') {
            const [chief] = await connection.execute(
              'SELECT id FROM employees WHERE id = ? AND admin_id = ?',
              [approver.approver_id, adminId]
            );
            if (chief.length === 0) {
              await connection.rollback();
              return res.status(400).json({
                error: 'Invalid approver',
                message: `Chief with ID ${approver.approver_id} not found`
              });
            }
          }
        }

        // Delete existing approval rules
        await connection.execute(
          'DELETE FROM approval_rules WHERE employee_id = ?',
          [employeeId]
        );

        // Insert new approval rules
        for (const approver of approvers) {
          await connection.execute(`
            INSERT INTO approval_rules (
              employee_id, approver_type, approver_id, sequence_order, 
              threshold_percentage, approval_description, is_chief
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            employeeId,
            approver.approver_type,
            approver.approver_id,
            approver.sequence_order,
            approver.threshold_percentage || 0,
            approver.approval_description || null,
            approver.is_chief || false
          ]);
        }

        await connection.commit();

        res.json({
          message: 'Approval rules updated successfully'
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Set approval rules error:', error);
      res.status(500).json({
        error: 'Failed to set approval rules',
        message: 'Internal server error while setting approval rules'
      });
    }
  }
);

module.exports = router;