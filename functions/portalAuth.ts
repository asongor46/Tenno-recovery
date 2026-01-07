import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Portal authentication verification endpoint
 * Validates session tokens for portal users
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, session_token } = await req.json();

    if (action === "verify") {
      if (!session_token) {
        return Response.json({
          success: false,
          error: 'No session token provided'
        });
      }

      const portalUsers = await base44.asServiceRole.entities.PortalUser.filter({
        session_token: session_token
      });

      if (portalUsers.length === 0) {
        return Response.json({
          success: false,
          error: 'Invalid session token'
        });
      }

      const portalUser = portalUsers[0];

      if (portalUser.session_expires_at) {
        const expiresAt = new Date(portalUser.session_expires_at);
        if (expiresAt < new Date()) {
          return Response.json({
            success: false,
            error: 'Session expired'
          });
        }
      }

      return Response.json({
        success: true,
        user: {
          id: portalUser.id,
          email: portalUser.email,
          full_name: portalUser.full_name
        }
      });
    }

    return Response.json({
      success: false,
      error: 'Invalid action'
    });

  } catch (error) {
    console.log('[portalAuth] ERROR:', error?.message);
    return Response.json({
      success: false,
      error: 'An error occurred during authentication.'
    });
  }
});