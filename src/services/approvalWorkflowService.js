const { getConnection } = require('../config/database');

class ApprovalWorkflowService {
  async processApprovalWorkflow(requestId, approverId, approverType, action, comments, approvedAmount) {
    const connection = getConnection();
    
    try {
      await connection.beginTransaction();

      // Get the current request details
      const [requests] = await connection.execute(`
        SELECT 
          ar.*,
          e.name as employee_name,
          e.admin_id
        FROM approval_requests ar
        JOIN employees e ON ar.employee_id = e.id
        WHERE ar.id = ? AND ar.status = 'pending'
      `, [requestId]);

      if (requests.length === 0) {
        throw new Error('Request not found or not in pending status');
      }

      const request = requests[0];
      const finalApprovedAmount = approvedAmount || request.converted_amount || request.amount;

      // Verify current approver
      if (request.current_approver_id !== approverId || request.current_approver_type !== approverType) {
        throw new Error('You are not the current approver for this request');
      }

      // Record approval history
      await connection.execute(`
        INSERT INTO approval_history (
          request_id, approver_id, approver_type, action, 
          comments, approved_amount, sequence_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [requestId, approverId, approverType, action, comments, finalApprovedAmount, request.approval_sequence]);

      if (action === 'rejected') {
        // If rejected, update request status to rejected
        await connection.execute(
          'UPDATE approval_requests SET status = ?, current_approver_id = NULL, current_approver_type = NULL WHERE id = ?',
          ['rejected', requestId]
        );
      } else {
        // If approved, check if there are more approvers in sequence
        const [nextApprover] = await connection.execute(`
          SELECT approver_id, approver_type, sequence_order, threshold_percentage, is_chief
          FROM approval_rules 
          WHERE employee_id = ? 
            AND sequence_order > ?
          ORDER BY sequence_order ASC
          LIMIT 1
        `, [request.employee_id, request.approval_sequence]);

        if (nextApprover.length > 0) {
          // Check if threshold is met for automatic approval
          const thresholdAmount = (request.converted_amount || request.amount) * (nextApprover[0].threshold_percentage / 100);
          
          if (nextApprover[0].threshold_percentage > 0 && finalApprovedAmount <= thresholdAmount) {
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
            // Move to next approver (chief or another manager)
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
      
      return {
        success: true,
        message: `Request ${action} successfully`,
        requestId: requestId,
        action: action
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  async getApprovalWorkflow(employeeId) {
    const connection = getConnection();
    
    try {
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
          END as approver_name,
          CASE 
            WHEN ar.approver_type = 'manager' THEN m.email
            WHEN ar.approver_type = 'chief' THEN e.email
          END as approver_email
        FROM approval_rules ar
        LEFT JOIN managers m ON ar.approver_type = 'manager' AND ar.approver_id = m.id
        LEFT JOIN employees e ON ar.approver_type = 'chief' AND ar.approver_id = e.id
        WHERE ar.employee_id = ?
        ORDER BY ar.sequence_order
      `, [employeeId]);

      return rules;
    } catch (error) {
      throw error;
    }
  }

  async validateApprovalRules(employeeId, approvers, adminId) {
    const connection = getConnection();
    
    try {
      // Verify employee belongs to admin
      const [employee] = await connection.execute(
        'SELECT id FROM employees WHERE id = ? AND admin_id = ?',
        [employeeId, adminId]
      );

      if (employee.length === 0) {
        throw new Error('Employee not found or does not belong to your company');
      }

      // Validate each approver
      for (const approver of approvers) {
        if (approver.approver_type === 'manager') {
          const [manager] = await connection.execute(
            'SELECT id FROM managers WHERE id = ? AND admin_id = ? AND is_active = 1',
            [approver.approver_id, adminId]
          );
          if (manager.length === 0) {
            throw new Error(`Manager with ID ${approver.approver_id} not found or inactive`);
          }
        } else if (approver.approver_type === 'chief') {
          const [chief] = await connection.execute(
            'SELECT id FROM employees WHERE id = ? AND admin_id = ? AND is_active = 1',
            [approver.approver_id, adminId]
          );
          if (chief.length === 0) {
            throw new Error(`Chief with ID ${approver.approver_id} not found or inactive`);
          }
        } else {
          throw new Error(`Invalid approver type: ${approver.approver_type}`);
        }

        // Validate sequence order
        if (!Number.isInteger(approver.sequence_order) || approver.sequence_order < 1) {
          throw new Error('Sequence order must be a positive integer');
        }

        // Validate threshold percentage
        if (approver.threshold_percentage !== undefined) {
          if (typeof approver.threshold_percentage !== 'number' || 
              approver.threshold_percentage < 0 || 
              approver.threshold_percentage > 100) {
            throw new Error('Threshold percentage must be between 0 and 100');
          }
        }
      }

      // Check for duplicate sequence orders
      const sequenceOrders = approvers.map(a => a.sequence_order);
      const uniqueSequenceOrders = [...new Set(sequenceOrders)];
      if (sequenceOrders.length !== uniqueSequenceOrders.length) {
        throw new Error('Duplicate sequence orders are not allowed');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async setApprovalRules(employeeId, approvers, adminId) {
    const connection = getConnection();
    
    try {
      await connection.beginTransaction();

      // Validate approval rules
      await this.validateApprovalRules(employeeId, approvers, adminId);

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
      
      return {
        success: true,
        message: 'Approval rules updated successfully'
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  async getNextApprover(employeeId, currentSequence = 0) {
    const connection = getConnection();
    
    try {
      const [nextApprover] = await connection.execute(`
        SELECT approver_id, approver_type, sequence_order, threshold_percentage, is_chief
        FROM approval_rules 
        WHERE employee_id = ? 
          AND sequence_order > ?
        ORDER BY sequence_order ASC
        LIMIT 1
      `, [employeeId, currentSequence]);

      return nextApprover.length > 0 ? nextApprover[0] : null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ApprovalWorkflowService();