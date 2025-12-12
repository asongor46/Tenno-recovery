import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * WAITING PERIOD CHECKER
 * Scheduled function to check waiting periods and trigger actions
 * Should be called daily via cron/scheduler
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Find cases in waiting period that have ended
    const allCases = await base44.asServiceRole.entities.Case.filter({ 
      filing_status: 'awaiting_period'
    });

    const casesToUpdate = allCases.filter(c => {
      if (!c.waiting_period_end) return false;
      return c.waiting_period_end <= today;
    });

    const results = {
      checked: allCases.length,
      waiting_periods_ended: casesToUpdate.length,
      cases_updated: [],
    };

    // Update cases and trigger notifications
    for (const caseData of casesToUpdate) {
      // Update status to order phase
      await base44.asServiceRole.entities.Case.update(caseData.id, {
        filing_status: 'order_phase',
      });

      // Log activity
      await base44.asServiceRole.entities.ActivityLog.create({
        case_id: caseData.id,
        action: 'waiting_period_ended',
        description: `Waiting period ended. Case moved to Order Phase.`,
        performed_by: 'system',
        metadata: {
          waiting_period_start: caseData.waiting_period_start,
          waiting_period_end: caseData.waiting_period_end,
        }
      });

      // Create todo for order filing
      await base44.asServiceRole.entities.Todo.create({
        case_id: caseData.id,
        title: `File Proposed Order - ${caseData.owner_name}`,
        description: `Waiting period has ended. File proposed order with court.`,
        priority: 'high',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
        is_completed: false,
        auto_generated: true
      });

      // Send alert
      await base44.asServiceRole.entities.Alert.create({
        case_id: caseData.id,
        title: 'Waiting Period Ended',
        message: `${caseData.owner_name} - ${caseData.case_number}: Ready to file proposed order`,
        type: 'action_required',
        priority: 'high',
        is_read: false,
      });

      results.cases_updated.push({
        case_id: caseData.id,
        case_number: caseData.case_number,
        owner_name: caseData.owner_name,
      });
    }

    return Response.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});