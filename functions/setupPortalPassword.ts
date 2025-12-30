import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SETUP PORTAL PASSWORD
 * Creates portal account after access code validation
 * Marks code as used and returns session token
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { email, access_code, password_hash, remember_me = false } = await req.json();

    // Normalize inputs
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedCode = access_code?.toUpperCase().trim();

    if (!normalizedEmail || !normalizedCode || !password_hash) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Re-validate access code (security check)
    const cases = await base44.asServiceRole.entities.Case.filter({
      owner_email: normalizedEmail,
      portal_access_code: normalizedCode,
      portal_code_used: false
    });

    if (cases.length === 0) {
      return Response.json({
        success: false,
        error: 'Invalid or expired access code'
      }, { status: 401 });
    }

    // Check if PortalUser already exists
    const existingUsers = await base44.asServiceRole.entities.PortalUser.filter({
      email: normalizedEmail
    });

    if (existingUsers.length > 0) {
      return Response.json({
        success: false,
        error: 'Account already exists. Please sign in instead.'
      }, { status: 409 });
    }

    // Get display name from first case
    const displayName = cases[0].owner_name || normalizedEmail.split('@')[0];

    // Generate session token
    const sessionToken = generateToken();
    const now = new Date().toISOString();

    // Create PortalUser
    const newUser = await base44.asServiceRole.entities.PortalUser.create({
      email: normalizedEmail,
      password_hash,
      display_name: displayName,
      last_login_at: now,
      login_count: 1,
      is_active: true,
      remember_token: remember_me ? sessionToken : null,
      remember_expires_at: remember_me ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
    });

    // Update ALL cases for this email - mark code as used
    for (const caseData of cases) {
      await base44.asServiceRole.entities.Case.update(caseData.id, {
        portal_code_used: true,
        portal_code_used_at: now
      });

      // Log activity
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          case_id: caseData.id,
          action: 'portal_account_created',
          description: `Homeowner created portal account`,
          performed_by: normalizedEmail,
          metadata: { timestamp: now }
        });
      } catch (e) {
        console.log('Activity log failed:', e.message);
      }
    }

    // Build case list for response
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
      user: {
        email: newUser.email,
        display_name: newUser.display_name
      },
      session_token: sessionToken,
      cases: caseList
    });

  } catch (error) {
    console.log('[setupPortalPassword] ERROR:', error?.message);
    return Response.json({
      success: false,
      error: 'An error occurred. Please try again.'
    }, { status: 500 });
  }
});

/**
 * Generate random 64-character session token
 */
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}