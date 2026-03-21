import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * SECURE PORTAL UPDATE ENDPOINT
 * Verifies session_token, confirms case ownership, then updates only allowed fields per action.
 * Actions: "sign_agreement" | "submit_info" | "submit_notary"
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { session_token, case_id, action, payload } = await req.json();

    if (!session_token || !case_id || !action) {
      return Response.json({ success: false, error: 'session_token, case_id, and action required' }, { status: 400 });
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

    // 2. Confirm case ownership
    const allCases = await base44.asServiceRole.entities.Case.filter({ id: case_id });
    const c = allCases[0];
    if (!c || c.owner_email?.toLowerCase() !== verifiedEmail.toLowerCase()) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date().toISOString();
    let updateData = {};
    let logAction = '';
    let logDescription = '';

    if (action === 'sign_agreement') {
      if (!payload?.signature) {
        return Response.json({ success: false, error: 'signature required' }, { status: 400 });
      }
      if (!c.fee_percent || c.fee_percent <= 0) {
        return Response.json({ success: false, error: 'Fee not set. Contact your agent.' }, { status: 400 });
      }
      updateData = {
        agreement_signed_at: now,
        agreement_signature: payload.signature,
        agreement_status: 'signed',
        stage: 'agreement_signed',
        fee_locked: true,
        fee_locked_at: now,
        fee_percent_at_signing: c.fee_percent,
      };
      logAction = 'Agreement Signed';
      logDescription = 'Homeowner signed the service agreement via portal';

      // Also create HomeownerTaskEvent
      await base44.asServiceRole.entities.HomeownerTaskEvent.create({
        case_id: c.id,
        event_type: 'agreement_signed',
        step_key: 'agreement',
        performed_by: verifiedEmail,
        details: { signed_at: now },
      });

    } else if (action === 'submit_info') {
      const allowed = [
        'owner_name','owner_address','owner_city','owner_state','owner_zip',
        'owner_phone','owner_dob','owner_ssn_last_four',
        'id_front_url','id_back_url','id_uploaded_at',
      ];
      for (const k of Object.keys(payload)) {
        if (!allowed.includes(k)) {
          return Response.json({ success: false, error: `Field not allowed: ${k}` }, { status: 400 });
        }
      }
      updateData = { ...payload, stage: 'info_completed', info_submitted_at: now };
      logAction = 'Info Completed';
      logDescription = 'Homeowner submitted personal information and ID via portal';

    } else if (action === 'submit_notary') {
      updateData = {
        notary_type: 'in_person',
        notary_packet_uploaded: true,
        notary_packet_upload_url: payload?.primary_url || null,
        notary_verified: 'pending',
        stage: 'notary_completed',
      };
      logAction = 'Notarization Packet Uploaded';
      logDescription = `Homeowner uploaded notarized document(s) via portal`;

    } else {
      return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }

    // 3. Perform the update with service role
    await base44.asServiceRole.entities.Case.update(c.id, updateData);

    // 4. Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      case_id: c.id,
      action: logAction,
      description: logDescription,
      performed_by: 'Homeowner',
      is_client_visible: true,
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('updatePortalCase error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});