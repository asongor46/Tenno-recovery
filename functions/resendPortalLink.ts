import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * RESEND PORTAL LINK ("Lost Your Link")
 * Generates new token, invalidates old one, preserves all case data
 * No authentication required - email-based recovery
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { owner_email } = await req.json();

    if (!owner_email) {
      return Response.json({ 
        status: 'error',
        details: 'owner_email required' 
      }, { status: 400 });
    }

    // Find case by email
    const cases = await base44.asServiceRole.entities.Case.filter({ 
      owner_email: owner_email.toLowerCase().trim() 
    });
    
    if (cases.length === 0) {
      // Don't reveal whether email exists (security)
      return Response.json({
        status: 'success',
        message: 'If an account exists with this email, a new portal link has been sent.'
      });
    }

    const caseData = cases[0];

    // Generate NEW token
    const newToken = generateUniqueToken();

    // Update case with new token (invalidates old one)
    await base44.asServiceRole.entities.Case.update(caseData.id, { 
      portal_token: newToken 
    });

    // Build portal URL
    const portalUrl = `${Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.com'}/PortalWelcome?token=${newToken}`;

    // Send email with new link
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner_email,
      subject: `Your Surplus Recovery Portal Link - ${caseData.case_number}`,
      body: `Dear ${caseData.owner_name},

Here is your secure portal link to access your surplus recovery case:

${portalUrl}

This link has been regenerated for security. Your previous link is no longer valid, but all your data and progress has been preserved.

Case: ${caseData.case_number}
County: ${caseData.county}, ${caseData.state}
Surplus Amount: $${caseData.surplus_amount?.toLocaleString() || '0'}

For questions, contact: tennoassetrecovery@gmail.com

Best regards,
TENNO Recovery`
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      case_id: caseData.id,
      action: 'portal_link_resent',
      description: 'New portal token generated via email recovery',
      performed_by: 'system',
      metadata: { email: owner_email }
    });

    return Response.json({
      status: 'success',
      message: 'If an account exists with this email, a new portal link has been sent.'
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