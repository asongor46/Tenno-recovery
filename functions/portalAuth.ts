import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Portal authentication verification endpoint
 * Validates session tokens for portal users
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, session_token } = await req.json();

    console.log('[portalAuth] Action:', action);
    console.log('[portalAuth] Token received:', session_token ? 'YES' : 'NO');

    if (action === "verify") {
      if (!session_token) {
        console.log('[portalAuth] ❌ No token provided');
        return Response.json({
          success: false,
          error: 'No session token provided'
        });
      }

      console.log('[portalAuth] Looking up PortalUser with token...');
      const portalUsers = await base44.asServiceRole.entities.PortalUser.filter({
        session_token: session_token
      });

      console.log('[portalAuth] PortalUsers found:', portalUsers.length);

      if (portalUsers.length === 0) {
        console.log('[portalAuth] ❌ No user found with this token');
        return Response.json({
          success: false,
          error: 'Invalid session token'
        });
      }

      const portalUser = portalUsers[0];
      console.log('[portalAuth] Found user:', portalUser.email);

      if (portalUser.session_expires_at) {
        const expiresAt = new Date(portalUser.session_expires_at);
        const now = new Date();
        console.log('[portalAuth] Checking expiration:', {
          expires: expiresAt.toISOString(),
          now: now.toISOString(),
          expired: expiresAt < now
        });
        
        if (expiresAt < now) {
          console.log('[portalAuth] ❌ Session expired');
          return Response.json({
            success: false,
            error: 'Session expired'
          });
        }
      }

      console.log('[portalAuth] ✅ Verification successful');
      return Response.json({
        success: true,
        user: {
          id: portalUser.id,
          email: portalUser.email,
          full_name: portalUser.full_name
        }
      });
    }

    console.log('[portalAuth] ❌ Invalid action');
    return Response.json({
      success: false,
      error: 'Invalid action'
    });

  } catch (error) {
    console.log('[portalAuth] ❌ ERROR:', error?.message);
    console.error('[portalAuth] Stack:', error?.stack);
    return Response.json({
      success: false,
      error: 'An error occurred during authentication.'
    });
  }
});