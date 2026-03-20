import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, owner_email } = await req.json();
    const lookupEmail = (email || owner_email)?.trim().toLowerCase();

    if (!lookupEmail) {
      return Response.json({ status: 'error', details: 'Email required' }, { status: 400 });
    }

    // Find all cases for this email
    const cases = await base44.asServiceRole.entities.Case.filter({
      owner_email: lookupEmail
    });

    if (cases.length === 0) {
      // Don't reveal if email exists (security)
      return Response.json({
        status: 'success',
        message: 'If this email is associated with a case, a new access code has been sent.'
      });
    }

    // Generate a new crypto-secure access code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    let newCode = '';
    for (let i = 0; i < 8; i++) {
      newCode += chars[array[i] % chars.length];
    }

    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com';
    const portalUrl = `${appUrl}/PortalLogin`;

    // Update ALL cases for this email with the new code
    for (const c of cases) {
      await base44.asServiceRole.entities.Case.update(c.id, {
        portal_access_code: newCode,
        portal_code_generated_at: new Date().toISOString(),
        portal_code_used: false,
      });
    }

    const caseData = cases[0];

    // Send email with access code
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: lookupEmail,
      subject: 'TENNO Recovery – Your New Portal Access Code',
      body: `Hello ${caseData.owner_name || 'there'},

You requested a new access code for your surplus funds recovery portal.

Your access code: ${newCode}

Visit: ${portalUrl}

Enter your email (${lookupEmail}) and the access code above to log in.

If you did not request this, please ignore this email.

— TENNO Recovery
tennoassetrecovery@gmail.com`
    });

    // Log activity (non-blocking)
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        case_id: caseData.id,
        action: 'portal_code_resent',
        description: 'Portal access code resent via lost link flow',
        performed_by: 'system',
        metadata: { email: lookupEmail }
      });
    } catch (e) {
      console.log('Activity log failed:', e.message);
    }

    return Response.json({
      status: 'success',
      message: 'If this email is associated with a case, a new access code has been sent.'
    });

  } catch (error) {
    return Response.json({
      status: 'error',
      details: error.message
    }, { status: 500 });
  }
});