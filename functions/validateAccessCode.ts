import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * VALIDATE ACCESS CODE
 * Validates that an authenticated user's email matches cases with the provided access code
 * User must be authenticated first (via Base44 OAuth)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const { access_code } = await req.json();
    const email = user.email;

    // Normalize inputs
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedCode = access_code?.toUpperCase().trim();

    if (!normalizedEmail || !normalizedCode) {
      return Response.json({
        success: false,
        error: 'Invalid email or access code. Please check your credentials and try again.'
      }, { status: 400 });
    }

    // Query cases with matching email and unused access code
    const cases = await base44.asServiceRole.entities.Case.filter({
      owner_email: normalizedEmail,
      portal_access_code: normalizedCode,
      portal_code_used: false
    });

    if (cases.length === 0) {
      // Log failed attempt for security audit
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          case_id: null,
          action: 'portal_access_validation_failed',
          description: `Failed access code validation attempt for email: ${normalizedEmail}`,
          performed_by: 'system',
          metadata: { email: normalizedEmail, timestamp: new Date().toISOString() }
        });
      } catch (e) {
        console.log('Failed to log validation attempt:', e.message);
      }

      return Response.json({
        success: false,
        error: 'Invalid email or access code. Please check your credentials and try again.'
      }, { status: 200 });
    }

    // Return success with case list
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
    }, { status: 500 });
  }
});