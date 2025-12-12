import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CASE FILING FUNCTION
 * Handles case filing and initiates waiting period tracking
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, filing_method, tracking_number, notes } = await req.json();

    if (!case_id) {
      return Response.json({ 
        status: 'error',
        details: 'case_id required' 
      }, { status: 400 });
    }

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    // Validate packet exists
    if (!caseData.packet_url) {
      return Response.json({ 
        status: 'error',
        details: 'Filing packet must be generated before filing' 
      }, { status: 400 });
    }

    // Get county data for deadline calculation
    const counties = await base44.entities.County.filter({ 
      name: caseData.county,
      state: caseData.state
    });
    const county = counties[0];

    const filedAt = new Date().toISOString();
    
    // Calculate expected decision date (typical 60-90 days)
    const expectedDecisionDays = county?.processing_timeline?.match(/\d+/)?.[0] || 90;
    const expectedDecisionDate = new Date();
    expectedDecisionDate.setDate(expectedDecisionDate.getDate() + parseInt(expectedDecisionDays));

    // Update case
    await base44.entities.Case.update(case_id, {
      stage: 'filed',
      status: 'filed',
      filed_at: filedAt,
      internal_notes: (caseData.internal_notes || '') + 
        `\n\nFiled on ${new Date(filedAt).toLocaleDateString()} via ${filing_method || 'mail'}` +
        (tracking_number ? `\nTracking: ${tracking_number}` : '') +
        (notes ? `\nNotes: ${notes}` : '')
    });

    // Create filing event
    await base44.entities.HomeownerTaskEvent.create({
      case_id,
      event_type: 'step_completed',
      step_key: 'filed',
      performed_by: user.email,
      details: {
        filed_at: filedAt,
        filing_method,
        tracking_number,
        expected_decision_date: expectedDecisionDate.toISOString()
      }
    });

    // Create waiting period todo
    await base44.entities.Todo.create({
      case_id,
      title: 'Follow up on Filing Status',
      description: `Check with ${county?.clerk_name || 'county clerk'} on filing status`,
      priority: 'medium',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      auto_generated: true,
      is_completed: false
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'case_filed',
      description: `Case filed via ${filing_method || 'mail'}${tracking_number ? ` (Tracking: ${tracking_number})` : ''}`,
      performed_by: user.email,
      metadata: { filing_method, tracking_number, filed_at: filedAt }
    });

    return Response.json({
      status: 'success',
      filed_at: filedAt,
      expected_decision_date: expectedDecisionDate.toISOString()
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});