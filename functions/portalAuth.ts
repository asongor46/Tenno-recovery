import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PORTAL AUTHENTICATION
 * Handles homeowner login, registration, and session verification
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, email, password_hash, remember_me, session_token } = await req.json();

    if (action === 'register') {
      // Check if user already exists
      const existing = await base44.entities.PortalUser.filter({ email });
      if (existing.length > 0) {
        return Response.json({ 
          success: false, 
          error: 'An account with this email already exists' 
        });
      }

      // Get display name from first case
      const cases = await base44.entities.Case.filter({ owner_email: email }, '-created_date', 1);
      const display_name = cases[0]?.owner_name || email.split('@')[0];

      // Create user account
      const user = await base44.entities.PortalUser.create({
        email,
        password_hash,
        display_name,
        login_count: 0,
        is_active: true
      });

      // Generate session token
      const token = generateToken();
      const expires_at = remember_me 
        ? new Date(Date.now() + 30*24*60*60*1000).toISOString() // 30 days
        : new Date(Date.now() + 24*60*60*1000).toISOString(); // 24 hours

      await base44.entities.PortalUser.update(user.id, {
        remember_token: token,
        remember_expires_at: expires_at,
        last_login_at: new Date().toISOString(),
        login_count: 1
      });

      return Response.json({
        success: true,
        session_token: token,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        }
      });
    }

    if (action === 'login') {
      // Find user by email
      const users = await base44.entities.PortalUser.filter({ email });
      if (users.length === 0) {
        return Response.json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      const user = users[0];

      // Check if account is active
      if (!user.is_active) {
        return Response.json({ 
          success: false, 
          error: 'This account has been disabled. Please contact support.' 
        });
      }

      // Verify password
      if (user.password_hash !== password_hash) {
        return Response.json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      // Generate new session token
      const token = generateToken();
      const expires_at = remember_me 
        ? new Date(Date.now() + 30*24*60*60*1000).toISOString()
        : new Date(Date.now() + 24*60*60*1000).toISOString();

      await base44.entities.PortalUser.update(user.id, {
        remember_token: token,
        remember_expires_at: expires_at,
        last_login_at: new Date().toISOString(),
        login_count: (user.login_count || 0) + 1
      });

      return Response.json({
        success: true,
        session_token: token,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        }
      });
    }

    if (action === 'verify') {
      if (!session_token) {
        return Response.json({ success: false, error: 'No session token' });
      }

      // Find user by token
      const users = await base44.entities.PortalUser.filter({ remember_token: session_token });
      if (users.length === 0) {
        return Response.json({ success: false, error: 'Invalid session' });
      }

      const user = users[0];

      // Check if token expired
      if (user.remember_expires_at && new Date(user.remember_expires_at) < new Date()) {
        return Response.json({ success: false, error: 'Session expired' });
      }

      // Check if account is active
      if (!user.is_active) {
        return Response.json({ success: false, error: 'Account disabled' });
      }

      return Response.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        }
      });
    }

    if (action === 'logout') {
      if (session_token) {
        const users = await base44.entities.PortalUser.filter({ remember_token: session_token });
        if (users.length > 0) {
          await base44.entities.PortalUser.update(users[0].id, {
            remember_token: null,
            remember_expires_at: null
          });
        }
      }
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[portalAuth] Error:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}