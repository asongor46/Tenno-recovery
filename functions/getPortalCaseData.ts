import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * SECURE PORTAL SINGLE-CASE ENDPOINT
 * Verifies session_token, confirms case ownership, returns sanitized case data.
 */

const SAFE_CASE_FIELDS = [
  'id', 'case_number', 'owner_name', 'owner_email', 'owner_phone',
  'owner_address', 'owner_city', 'owner_state', 'owner_zip',
  'owner_dob', 'owner_ssn_last_four',
  'property_address', 'county', 'state',
  'surplus_amount', 'fee_percent', 'fee_locked',
  'stage', 'agreement_status', 'agreement_signed_at',
  'notary_required', 'notary_packet_uploaded', 'notary_packet_url',
  'notary_packet_generated_at', 'notary_verified',
  'id_front_url', 'id_back_url', 'id_uploaded_at',
  'info_submitted_at', 'waiting_period_end', 'filed_at',
  'order_signed_date', 'paid_at', 'closed_at',
  'portal_link', 'filing_status',
  'updated_date', 'created_date',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { session_token, case_id } = await req.json();

    if (!session_token || !case_id) {
      return Response.json({ success: false, error: 'session_token and case_id required' }, { status: 400 });
    }

    // 1. Verify session
    const portalUsers = await base44.asServiceRole.entities.PortalUser.filter({ session_token });
    const portalUser = portalUsers[0];
    if (!portalUser) {
      return Response.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }
    if (portalUser.session_expires_at && new Date(portalUser.session_expires_at) < new Date()) {
      return Response.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    const verifiedEmail = portalUser.email;

    // 2. Fetch and verify ownership
    const cases = await base44.asServiceRole.entities.Case.filter({ id: case_id });
    const c = cases[0];
    if (!c || c.owner_email?.toLowerCase() !== verifiedEmail.toLowerCase()) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // 3. Sanitize
    const safe = {};
    for (const field of SAFE_CASE_FIELDS) {
      if (c[field] !== undefined) safe[field] = c[field];
    }

    // 4. Fetch primary agreement document if any
    const agreementDocs = await base44.asServiceRole.entities.Document.filter({
      case_id: c.id, category: 'agreement', is_primary: true,
    });

    return Response.json({
      success: true,
      case: safe,
      agreement_doc: agreementDocs[0] ? { file_url: agreementDocs[0].file_url } : null,
    });

  } catch (error) {
    console.error('getPortalCaseData error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});