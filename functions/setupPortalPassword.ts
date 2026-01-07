import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, access_code, password_hash, remember_me } = await req.json();

    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedCode = access_code?.toUpperCase().trim();

    if (!normalizedEmail || !normalizedCode || !password_hash) {
      return Response.json({
        success: false,
        error: 'Missing required fields.'
      });
    }

    const cases = await base44.asServiceRole.entities.Case.filter({
      owner_email: normalizedEmail,
      portal_access_code: normalizedCode,
      portal_code_used: false
    });

    if (cases.length === 0) {
      return Response.json({
        success: false,
        error: 'Invalid or expired access code.'
      });
    }

    const caseRecord = cases[0];

    let portalUser = (await base44.asServiceRole.entities.PortalUser.filter({ email: normalizedEmail }))[0];

    if (portalUser) {
      portalUser = await base44.asServiceRole.entities.PortalUser.update(portalUser.id, {
        password_hash,
        last_login_at: new Date().toISOString()
      });
    } else {
      portalUser = await base44.asServiceRole.entities.PortalUser.create({
        email: normalizedEmail,
        password_hash,
        full_name: caseRecord.owner_name,
        phone: caseRecord.owner_phone,
        last_login_at: new Date().toISOString()
      });
    }

    await base44.asServiceRole.entities.Case.update(caseRecord.id, {
      portal_code_used: true,
      portal_code_used_at: new Date().toISOString()
    });

    const session_token = crypto.randomUUID();
    const session_expires_at = remember_me ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

    await base44.asServiceRole.entities.PortalUser.update(portalUser.id, {
      session_token,
      session_expires_at
    });

    return Response.json({
      success: true,
      message: 'Account created and logged in.',
      user: { id: portalUser.id, email: portalUser.email, full_name: portalUser.full_name },
      session_token,
      session_expires_at
    });

  } catch (error) {
    console.log('[setupPortalPassword] ERROR:', error?.message);
    return Response.json({
      success: false,
      error: 'An error occurred during password setup. Please try again.'
    });
  }
});