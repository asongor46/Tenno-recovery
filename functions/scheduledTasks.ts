import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SCHEDULED TASKS - Step 14
 * Background automation: check overdue invoices, send reminders, advance workflows
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task } = await req.json();

    let result;
    
    switch (task) {
      case 'check_overdue_invoices':
        result = await checkOverdueInvoices(base44);
        break;
      case 'send_workflow_reminders':
        result = await sendWorkflowReminders(base44);
        break;
      case 'auto_advance_cases':
        result = await autoAdvanceCases(base44);
        break;
      case 'cleanup_old_data':
        result = await cleanupOldData(base44);
        break;
      default:
        return Response.json({ 
          status: 'error',
          details: 'Invalid task' 
        }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      result
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

async function checkOverdueInvoices(base44) {
  const { data } = await base44.functions.invoke('invoiceAutomation', {
    action: 'check_overdue'
  });
  
  return data.result;
}

async function sendWorkflowReminders(base44) {
  const cases = await base44.entities.Case.filter({ 
    status: 'active' 
  });
  
  let remindersSent = 0;
  
  for (const c of cases) {
    // Check if stuck in a stage for 7+ days
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(c.updated_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate >= 7 && c.owner_email) {
      try {
        await base44.functions.invoke('homeownerWorkflowService', {
          action: 'send_reminders',
          case_id: c.id
        });
        remindersSent++;
      } catch (error) {
        console.error(`Failed to send reminder for case ${c.id}:`, error);
      }
    }
  }
  
  return { remindersSent };
}

async function autoAdvanceCases(base44) {
  const cases = await base44.entities.Case.filter({ 
    status: 'active' 
  });
  
  let advanced = 0;
  
  for (const c of cases) {
    try {
      const { data } = await base44.functions.invoke('homeownerWorkflowService', {
        action: 'check_advancement',
        case_id: c.id
      });
      
      if (data.result.count > 0) {
        advanced += data.result.count;
      }
    } catch (error) {
      console.error(`Failed to check advancement for case ${c.id}:`, error);
    }
  }
  
  return { advanced };
}

async function cleanupOldData(base44) {
  const { data } = await base44.functions.invoke('dataCleanup', {
    action: 'clean_orphans'
  });
  
  return data.result;
}