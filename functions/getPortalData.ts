import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * SECURE PORTAL DATA ENDPOINT (2A)
 * Verifies session_token server-side, returns only the verified user's data.
 * No client-supplied email is trusted.
 */

const SAFE_CASE_FIELDS = [
  'id', 'case_number', 'owner_name', 'owner_email', 'owner_phone',
  'owner_address', 'owner_city', 'owner_state', 'owner_zip',
  'owner_dob', 'owner_ssn_last_four',
  'property_address', 'county', 'state',
  'surplus_amount', 'fee_percent', 'fee_locked',
  'stage', 'agreement_status', 'agreement_signed_at',
  'notary_required', 'notary_packet_uploaded', 'notary_verified',
  'id_front_url', 'id_back_url', 'id_uploaded_at',
  'info_submitted_at', 'waiting_period_end', 'filed_at',
  'order_signed_date', 'paid_at', 'closed_at',
  'portal_link', 'filing_status',
  'updated_date', 'created_date',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { session_token } = await req.json();

    if (!session_token) {
      return Response.json({ success: false, error: 'session_token required' }, { status: 400 });
    }

    // 1. Verify session server-side
    const portalUsers = await base44.asServiceRole.entities.PortalUser.filter({ session_token });
    const portalUser = portalUsers[0];

    if (!portalUser) {
      return Response.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    // 2. Check expiry
    if (portalUser.session_expires_at && new Date(portalUser.session_expires_at) < new Date()) {
      return Response.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    const verifiedEmail = portalUser.email;

    // 3. Fetch ONLY cases belonging to this verified email
    const allCases = await base44.asServiceRole.entities.Case.filter({ owner_email: verifiedEmail });

    // 4. Sanitize — strip internal fields
    const sanitizedCases = allCases.map(c => {
      const safe = {};
      for (const field of SAFE_CASE_FIELDS) {
        if (c[field] !== undefined) safe[field] = c[field];
      }
      return safe;
    });

    // 5. Fetch ONLY activities for verified case IDs (is_client_visible)
    const caseIds = allCases.map(c => c.id);
    let activities = [];
    if (caseIds.length > 0) {
      // Fetch recent activities and filter to these case IDs
      const allActivities = await base44.asServiceRole.entities.ActivityLog.filter(
        { is_client_visible: true }, '-created_date', 100
      );
      activities = allActivities
        .filter(a => caseIds.includes(a.case_id))
        .slice(0, 20)
        .map(a => ({
          id: a.id,
          case_id: a.case_id,
          action: a.action,
          description: a.description,
          created_date: a.created_date,
        }));
    }

    return Response.json({
      success: true,
      email: verifiedEmail,
      cases: sanitizedCases,
      activities,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});