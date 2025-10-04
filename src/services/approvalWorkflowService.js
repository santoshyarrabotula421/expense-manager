const { 
  ApprovalWorkflow, 
  ApprovalWorkflowStep, 
  ApprovalRule, 
  ApprovalStep, 
  ApprovalHistory, 
  Notification,
  User,
  Expense
} = require('../models');
const { Op } = require('sequelize');

class ApprovalWorkflowService {
  
  // Initialize approval workflow for an expense
  async initializeWorkflow(expense) {
    try {
      // Get the appropriate workflow for this expense
      const workflow = await this.getWorkflowForExpense(expense);
      
      if (!workflow) {
        throw new Error('No suitable workflow found for this expense');
      }

      // Update expense with workflow
      await expense.update({ 
        workflow_id: workflow.id,
        status: 'submitted',
        submitted_at: new Date()
      });

      // Get workflow steps
      const workflowSteps = await ApprovalWorkflowStep.findAll({
        where: { workflow_id: workflow.id },
        order: [['step_number', 'ASC']]
      });

      // Apply approval rules to modify workflow if needed
      const modifiedSteps = await this.applyApprovalRules(expense, workflowSteps, workflow);

      // Create approval steps for this expense
      const approvalSteps = await this.createApprovalSteps(expense, modifiedSteps);

      // Start the approval process
      await this.startApprovalProcess(expense, approvalSteps);

      // Create history entry
      await ApprovalHistory.createEntry(expense.id, expense.user_id, 'submitted', {
        newStatus: 'in_approval',
        metadata: { workflow_id: workflow.id }
      });

      return {
        workflow,
        approvalSteps,
        nextApprover: approvalSteps.length > 0 ? approvalSteps[0] : null
      };

    } catch (error) {
      console.error('Error initializing workflow:', error);
      throw error;
    }
  }

  // Get the appropriate workflow for an expense
  async getWorkflowForExpense(expense) {
    // First, try to find a specific workflow based on amount, category, etc.
    const workflows = await ApprovalWorkflow.findAll({
      where: {
        company_id: expense.company_id,
        is_active: true
      },
      include: [{
        model: ApprovalWorkflowStep,
        as: 'steps',
        required: false
      }],
      order: [['is_default', 'DESC'], ['created_at', 'DESC']]
    });

    // Find the most suitable workflow
    for (const workflow of workflows) {
      if (await this.isWorkflowApplicable(workflow, expense)) {
        return workflow;
      }
    }

    // If no specific workflow found, return the default one
    return workflows.find(w => w.is_default) || workflows[0] || null;
  }

  // Check if a workflow is applicable for an expense
  async isWorkflowApplicable(workflow, expense) {
    const steps = workflow.steps || await workflow.getSteps();
    
    // Check if any step is applicable for this expense
    for (const step of steps) {
      if (step.isApplicableForExpense(expense)) {
        return true;
      }
    }

    // If workflow has no steps or no applicable steps, it's still usable as default
    return steps.length === 0 || workflow.is_default;
  }

  // Apply approval rules to modify the workflow
  async applyApprovalRules(expense, workflowSteps, workflow) {
    const rules = await ApprovalRule.findAll({
      where: {
        company_id: expense.company_id,
        [Op.or]: [
          { workflow_id: workflow.id },
          { workflow_id: null } // Global rules
        ],
        is_active: true
      },
      order: [['priority', 'DESC']]
    });

    let modifiedSteps = [...workflowSteps];

    for (const rule of rules) {
      if (rule.isApplicable(expense, workflow)) {
        const action = rule.executeAction(expense, modifiedSteps);
        modifiedSteps = await this.applyRuleAction(action, modifiedSteps, expense, rule);
      }
    }

    return modifiedSteps;
  }

  // Apply a specific rule action
  async applyRuleAction(action, steps, expense, rule) {
    if (!action) return steps;

    switch (action.action) {
      case 'auto_approve':
        // Mark expense as auto-approved
        await expense.update({ 
          status: 'approved', 
          approved_at: new Date() 
        });
        
        await ApprovalHistory.createEntry(expense.id, expense.user_id, 'auto_approved', {
          newStatus: 'approved',
          metadata: { rule_id: rule.id, reason: 'Auto-approved by rule' }
        });
        
        return []; // No approval steps needed

      case 'skip_step':
        if (action.step_number) {
          return steps.filter(step => step.step_number !== action.step_number);
        }
        return steps;

      case 'add_approver':
        if (action.approver_id) {
          const newStep = {
            step_number: steps.length + 1,
            step_name: `Additional Approver (Rule: ${rule.name})`,
            approver_type: 'specific_user',
            approver_id: action.approver_id,
            is_required: true,
            workflow_id: steps[0]?.workflow_id
          };
          return [...steps, newStep];
        }
        return steps;

      case 'require_approval':
        // This is handled by the normal workflow
        return steps;

      default:
        return steps;
    }
  }

  // Create approval steps for an expense
  async createApprovalSteps(expense, workflowSteps) {
    const approvalSteps = [];

    for (const workflowStep of workflowSteps) {
      // Skip steps that don't apply to this expense
      if (!workflowStep.isApplicableForExpense(expense)) {
        continue;
      }

      // Check for auto-approval threshold
      if (workflowStep.shouldAutoApprove(expense.amount_in_company_currency)) {
        await ApprovalHistory.createEntry(expense.id, expense.user_id, 'auto_approved', {
          stepNumber: workflowStep.step_number,
          newStatus: 'approved',
          metadata: { 
            reason: 'Auto-approved due to threshold',
            threshold: workflowStep.auto_approve_threshold
          }
        });
        continue;
      }

      // Get the approver(s) for this step
      const approvers = await workflowStep.getApprover(expense);
      
      if (!approvers) {
        console.warn(`No approver found for step ${workflowStep.step_number}`);
        continue;
      }

      // Handle multiple approvers (array) or single approver
      const approverList = Array.isArray(approvers) ? approvers : [approvers];

      for (const approver of approverList) {
        const approvalStep = await ApprovalStep.create({
          expense_id: expense.id,
          workflow_step_id: workflowStep.id,
          step_number: workflowStep.step_number,
          approver_id: approver.id,
          approver_type: workflowStep.approver_type,
          status: 'pending'
        });

        approvalSteps.push(approvalStep);
      }
    }

    return approvalSteps;
  }

  // Start the approval process
  async startApprovalProcess(expense, approvalSteps) {
    if (approvalSteps.length === 0) {
      // No approvals needed, mark as approved
      await expense.update({ 
        status: 'approved', 
        approved_at: new Date() 
      });
      return;
    }

    // Update expense status and current step
    await expense.update({ 
      status: 'in_approval',
      current_approval_step: 1
    });

    // Notify first approver(s)
    const firstStepApprovers = approvalSteps.filter(step => step.step_number === 1);
    
    for (const approvalStep of firstStepApprovers) {
      await this.notifyApprover(approvalStep, expense);
    }
  }

  // Process an approval action (approve/reject)
  async processApproval(approvalStepId, approverId, action, comments = null) {
    try {
      const approvalStep = await ApprovalStep.findByPk(approvalStepId, {
        include: [
          { model: Expense, as: 'expense', include: [{ model: User, as: 'user' }] },
          { model: User, as: 'approver' }
        ]
      });

      if (!approvalStep) {
        throw new Error('Approval step not found');
      }

      if (!approvalStep.canBeProcessedBy(approverId)) {
        throw new Error('User not authorized to process this approval');
      }

      const expense = approvalStep.expense;
      const approver = approvalStep.approver;

      // Process the action
      if (action === 'approve') {
        await approvalStep.approve(approverId, comments);
        
        // Create history entry
        await ApprovalHistory.createEntry(expense.id, approverId, 'approved', {
          stepNumber: approvalStep.step_number,
          previousStatus: 'pending',
          newStatus: 'approved',
          comments: comments
        });

        // Notify expense submitter
        await Notification.createApprovalResult(
          expense.user_id, 
          expense.id, 
          true, 
          approver.name, 
          comments
        );

        // Check if all approvals are complete
        await this.checkApprovalCompletion(expense);

      } else if (action === 'reject') {
        if (!comments || comments.trim().length === 0) {
          throw new Error('Rejection reason is required');
        }

        await approvalStep.reject(approverId, comments);
        
        // Update expense status
        await expense.update({ 
          status: 'rejected', 
          rejected_at: new Date(),
          rejection_reason: comments
        });

        // Create history entry
        await ApprovalHistory.createEntry(expense.id, approverId, 'rejected', {
          stepNumber: approvalStep.step_number,
          previousStatus: 'in_approval',
          newStatus: 'rejected',
          comments: comments
        });

        // Notify expense submitter
        await Notification.createApprovalResult(
          expense.user_id, 
          expense.id, 
          false, 
          approver.name, 
          comments
        );

        // Mark all other pending steps as skipped
        await this.skipRemainingSteps(expense.id, 'Expense rejected');

      } else {
        throw new Error('Invalid action. Must be "approve" or "reject"');
      }

      return { success: true, approvalStep, expense };

    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  // Check if all approvals are complete
  async checkApprovalCompletion(expense) {
    const pendingSteps = await ApprovalStep.findAll({
      where: {
        expense_id: expense.id,
        status: 'pending'
      },
      order: [['step_number', 'ASC']]
    });

    if (pendingSteps.length === 0) {
      // All approvals complete
      await expense.update({ 
        status: 'approved', 
        approved_at: new Date() 
      });

      await ApprovalHistory.createEntry(expense.id, expense.user_id, 'approved', {
        previousStatus: 'in_approval',
        newStatus: 'approved',
        metadata: { reason: 'All approvals completed' }
      });

    } else {
      // Move to next approval step
      const nextStep = pendingSteps[0];
      await expense.update({ 
        current_approval_step: nextStep.step_number 
      });

      // Notify next approver(s)
      const nextStepApprovers = pendingSteps.filter(
        step => step.step_number === nextStep.step_number
      );

      for (const approvalStep of nextStepApprovers) {
        await this.notifyApprover(approvalStep, expense);
      }
    }
  }

  // Skip remaining approval steps
  async skipRemainingSteps(expenseId, reason) {
    await ApprovalStep.update(
      { 
        status: 'skipped',
        comments: reason
      },
      {
        where: {
          expense_id: expenseId,
          status: 'pending'
        }
      }
    );
  }

  // Notify an approver
  async notifyApprover(approvalStep, expense) {
    const approver = await User.findByPk(approvalStep.approver_id);
    const submitter = await User.findByPk(expense.user_id);

    if (approver && submitter) {
      await Notification.createApprovalRequest(
        approver.id,
        expense.id,
        expense.amount_in_company_currency,
        submitter.name
      );

      // Mark as notified
      await approvalStep.update({ notified_at: new Date() });
    }
  }

  // Get pending approvals for a user
  async getPendingApprovalsForUser(userId, options = {}) {
    return await ApprovalStep.getPendingStepsForApprover(userId, options);
  }

  // Get approval statistics for a user
  async getApprovalStatsForUser(userId, days = 30) {
    return await ApprovalStep.getApprovalStats(userId, days);
  }

  // Escalate overdue approvals
  async escalateOverdueApprovals(hours = 48) {
    const overdueSteps = await ApprovalStep.findAll({
      where: {
        status: 'pending',
        created_at: {
          [Op.lt]: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      },
      include: [
        { model: Expense, as: 'expense', include: [{ model: User, as: 'user' }] },
        { model: User, as: 'approver' }
      ]
    });

    const escalations = [];

    for (const step of overdueSteps) {
      // Find escalation target (manager of the approver or admin)
      const escalationTarget = await this.findEscalationTarget(step.approver);
      
      if (escalationTarget) {
        // Create new approval step for escalation target
        const escalatedStep = await ApprovalStep.create({
          expense_id: step.expense_id,
          step_number: step.step_number,
          approver_id: escalationTarget.id,
          approver_type: 'escalated',
          status: 'pending'
        });

        // Skip the original step
        await step.update({ 
          status: 'skipped',
          comments: `Escalated due to ${hours}h timeout`
        });

        // Create history entry
        await ApprovalHistory.createEntry(step.expense_id, escalationTarget.id, 'escalated', {
          stepNumber: step.step_number,
          previousStatus: 'pending',
          newStatus: 'escalated',
          metadata: { 
            original_approver_id: step.approver_id,
            escalation_reason: 'Timeout',
            hours_overdue: hours
          }
        });

        // Notify escalation target
        await Notification.createEscalation(
          escalationTarget.id,
          step.expense_id,
          `Approval overdue for ${hours} hours`
        );

        escalations.push({
          originalStep: step,
          escalatedStep: escalatedStep,
          escalationTarget: escalationTarget
        });
      }
    }

    return escalations;
  }

  // Find escalation target for an approver
  async findEscalationTarget(approver) {
    // Try to find the approver's manager
    if (approver.manager_id) {
      const manager = await User.findByPk(approver.manager_id);
      if (manager && manager.is_active) {
        return manager;
      }
    }

    // If no manager, find an admin in the same company
    const admin = await User.findOne({
      where: {
        company_id: approver.company_id,
        role: 'admin',
        is_active: true
      }
    });

    return admin;
  }

  // Send reminder notifications for pending approvals
  async sendReminderNotifications(days = 2) {
    const reminderDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const pendingSteps = await ApprovalStep.findAll({
      where: {
        status: 'pending',
        created_at: {
          [Op.lt]: reminderDate
        },
        notified_at: {
          [Op.not]: null
        }
      },
      include: [
        { model: Expense, as: 'expense' },
        { model: User, as: 'approver' }
      ]
    });

    const reminders = [];

    for (const step of pendingSteps) {
      const daysOverdue = Math.ceil(
        (new Date() - new Date(step.created_at)) / (1000 * 60 * 60 * 24)
      );

      await Notification.createReminder(
        step.approver_id,
        step.expense_id,
        daysOverdue
      );

      reminders.push({
        approver: step.approver,
        expense: step.expense,
        daysOverdue: daysOverdue
      });
    }

    return reminders;
  }

  // Get workflow analytics for a company
  async getWorkflowAnalytics(companyId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await ApprovalHistory.findAll({
      where: {
        created_at: {
          [Op.gte]: startDate
        }
      },
      include: [{
        model: Expense,
        as: 'expense',
        where: { company_id: companyId },
        attributes: ['id', 'amount_in_company_currency']
      }],
      attributes: [
        'action',
        [this.sequelize.fn('COUNT', '*'), 'count'],
        [this.sequelize.fn('AVG', this.sequelize.col('expense.amount_in_company_currency')), 'avg_amount'],
        [this.sequelize.fn('DATE', this.sequelize.col('ApprovalHistory.created_at')), 'date']
      ],
      group: ['action', this.sequelize.fn('DATE', this.sequelize.col('ApprovalHistory.created_at'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('ApprovalHistory.created_at')), 'ASC']],
      raw: true
    });

    return analytics;
  }
}

module.exports = new ApprovalWorkflowService();