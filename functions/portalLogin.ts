import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password_hash, remember_me } = await req.json();

    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password_hash) {
      return Response.json({
        success: false,
        error: 'Missing email or password.'
      });
    }

    const portalUser = (await base44.asServiceRole.entities.PortalUser.filter({
      email: normalizedEmail,
      password_hash: password_hash
    }))[0];

    if (!portalUser) {
      return Response.json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    await base44.asServiceRole.entities.PortalUser.update(portalUser.id, {
      last_login_at: new Date().toISOString()
    });

    const session_token = crypto.randomUUID();
    const session_expires_at = remember_me ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

    await base44.asServiceRole.entities.PortalUser.update(portalUser.id, {
      session_token,
      session_expires_at
    });

    return Response.json({
      success: true,
      message: 'Logged in successfully.',
      user: { id: portalUser.id, email: portalUser.email, full_name: portalUser.full_name },
      session_token,
      session_expires_at
    });

  } catch (error) {
    console.log('[portalLogin] ERROR:', error?.message);
    return Response.json({
      success: false,
      error: 'An error occurred during login. Please try again.'
    });
  }
});