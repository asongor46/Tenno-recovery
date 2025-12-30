import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PORTAL LOGIN
 * Authenticates returning portal users with email + password
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { email, password_hash, remember_me = false } = await req.json();

    // Normalize email
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password_hash) {
      return Response.json({
        success: false,
        error: 'Invalid email or password.'
      }, { status: 401 });
    }

    // Find PortalUser
    const users = await base44.asServiceRole.entities.PortalUser.filter({
      email: normalizedEmail
    });

    if (users.length === 0) {
      // Log failed attempt
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          case_id: null,
          action: 'portal_login_failed',
          description: `Failed login attempt for email: ${normalizedEmail}`,
          performed_by: 'system',
          metadata: { email: normalizedEmail, timestamp: new Date().toISOString() }
        });
      } catch (e) {
        console.log('Failed to log login attempt:', e.message);
      }

      return Response.json({
        success: false,
        error: 'Invalid email or password.'
      }, { status: 401 });
    }

    const user = users[0];

    // Check if account is active
    if (!user.is_active) {
      return Response.json({
        success: false,
        error: 'Account disabled. Please contact support.'
      }, { status: 403 });
    }

    // Verify password hash
    if (user.password_hash !== password_hash) {
      // Log failed attempt
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          case_id: null,
          action: 'portal_login_failed',
          description: `Failed login attempt (wrong password) for: ${normalizedEmail}`,
          performed_by: 'system',
          metadata: { email: normalizedEmail, timestamp: new Date().toISOString() }
        });
      } catch (e) {
        console.log('Failed to log login attempt:', e.message);
      }

      return Response.json({
        success: false,
        error: 'Invalid email or password.'
      }, { status: 401 });
    }

    // Generate session token
    const sessionToken = remember_me ? generateToken() : null;
    const sessionExpiresAt = remember_me 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const now = new Date().toISOString();

    // Update user record
    await base44.asServiceRole.entities.PortalUser.update(user.id, {
      last_login_at: now,
      login_count: (user.login_count || 0) + 1,
      remember_token: sessionToken,
      remember_expires_at: sessionExpiresAt
    });

    // Fetch user's cases
    const cases = await base44.asServiceRole.entities.Case.filter({
      owner_email: normalizedEmail
    });

    const caseList = cases.map(c => ({
      id: c.id,
      case_number: c.case_number,
      county: c.county,
      state: c.state,
      property_address: c.property_address,
      surplus_amount: c.surplus_amount,
      stage: c.stage,
      agreement_status: c.agreement_status,
      status: c.status
    }));

    return Response.json({
      success: true,
      user: {
        email: user.email,
        display_name: user.display_name,
        last_login_at: now,
        login_count: (user.login_count || 0) + 1
      },
      session_token: sessionToken,
      session_expires_at: sessionExpiresAt,
      cases: caseList
    });

  } catch (error) {
    console.log('[portalLogin] ERROR:', error?.message);
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