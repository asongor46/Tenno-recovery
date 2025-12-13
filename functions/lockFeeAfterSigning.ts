import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * LOCK FEE AFTER AGREEMENT SIGNING
 * Called when agreement is signed - locks fee permanently
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

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

    // Check if already locked
    if (caseData.fee_locked) {
      return Response.json({
        status: 'success',
        message: 'Fee already locked',
        fee_percentage: caseData.fee_percentage,
        locked: true,
      });
    }

    // Lock fee
    await base44.entities.Case.update(case_id, {
      fee_locked: true,
      agreement_signed_at: new Date().toISOString(),
      agreement_status: 'signed',
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'fee_locked',
      description: `Fee locked at ${caseData.fee_percentage}% after agreement signed`,
      performed_by: user.email,
      metadata: { 
        fee_percentage: caseData.fee_percentage,
        surplus_amount: caseData.surplus_amount,
        fee_amount: (caseData.surplus_amount || 0) * ((caseData.fee_percentage || 20) / 100)
      }
    });

    return Response.json({
      status: 'success',
      message: 'Fee locked successfully',
      fee_percentage: caseData.fee_percentage,
      locked: true,
      surplus_amount: caseData.surplus_amount,
      fee_amount: (caseData.surplus_amount || 0) * ((caseData.fee_percentage || 20) / 100),
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});