import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * RESEND PORTAL LINK
 * Rotates token and resends portal link via email
 * Preserves all case data
 * No authentication required (email-based verification)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { email } = await req.json();

    if (!email) {
      return Response.json({ 
        status: 'error',
        details: 'Email required' 
      }, { status: 400 });
    }

    // Find case by owner email
    const cases = await base44.asServiceRole.entities.Case.filter({ 
      owner_email: email.trim().toLowerCase() 
    });

    if (cases.length === 0) {
      // Don't reveal if email exists or not (security)
      return Response.json({
        status: 'success',
        message: 'If this email is associated with a case, a link has been sent.'
      });
    }

    const caseData = cases[0];

    // Generate NEW token (rotate for security)
    const newToken = generateUniqueToken();

    // Update case with new token
    await base44.asServiceRole.entities.Case.update(caseData.id, { 
      portal_token: newToken 
    });

    // Build new portal URL
    const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com'}/PortalWelcome?token=${newToken}`;

    // Send email with new link
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: caseData.owner_email,
      subject: `Your Surplus Recovery Portal Access - ${caseData.case_number}`,
      body: `Dear ${caseData.owner_name},

Here is your secure portal access link:

${portalUrl}

This link has been updated for security. Your previous link is no longer valid.

Case Details:
- Case #: ${caseData.case_number}
- Property: ${caseData.property_address || 'N/A'}
- County: ${caseData.county}, ${caseData.state}
- Surplus Amount: $${caseData.surplus_amount?.toLocaleString() || '0'}

If you did not request this link, please ignore this email.

Questions? Reply to this email.

Best regards,
TENNO Recovery Team
tennoassetrecovery@gmail.com`
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      case_id: caseData.id,
      action: 'portal_link_resent',
      description: 'Portal link resent with new token',
      performed_by: 'system',
      metadata: { email }
    });

    await base44.asServiceRole.entities.HomeownerTaskEvent.create({
      case_id: caseData.id,
      event_type: 'portal_invited',
      performed_by: 'system',
      details: { reason: 'link_recovery' }
    });

    return Response.json({
      status: 'success',
      message: 'If this email is associated with a case, a link has been sent.'
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function generateUniqueToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}