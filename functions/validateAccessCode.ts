import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PUBLIC ENDPOINT - Validates access code for portal users (homeowners)
 * No authentication required
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { email, access_code } = await req.json();

    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedCode = access_code?.toUpperCase().trim();

    if (!normalizedEmail || !normalizedCode) {
      return Response.json({
        success: false,
        error: 'Invalid email or access code. Please check your credentials and try again.'
      }, { status: 200 });
    }

    const cases = await base44.asServiceRole.entities.Case.filter({
      owner_email: normalizedEmail,
      portal_access_code: normalizedCode,
      portal_code_used: false
    });

    if (cases.length === 0) {
      return Response.json({
        success: false,
        error: 'Invalid email or access code. Please check your credentials and try again.'
      }, { status: 200 });
    }

    const caseList = cases.map(c => ({
      id: c.id,
      case_number: c.case_number,
      county: c.county,
      state: c.state,
      property_address: c.property_address,
      surplus_amount: c.surplus_amount,
      stage: c.stage,
      agreement_status: c.agreement_status
    }));

    return Response.json({
      success: true,
      email: normalizedEmail,
      cases: caseList,
      requires_password_setup: true
    });

  } catch (error) {
    console.log('[validateAccessCode] ERROR:', error?.message);
    return Response.json({
      success: false,
      error: 'An error occurred. Please try again.'
    }, { status: 200 });
  }
});