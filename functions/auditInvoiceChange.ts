import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * INVOICE AUDIT LOGGER
 * Tracks all changes to invoices for security and compliance
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id, action, old_values, new_values, changed_fields } = await req.json();

    if (!invoice_id || !action) {
      return Response.json({ 
        status: 'error',
        details: 'invoice_id and action required' 
      }, { status: 400 });
    }

    // Get request metadata
    const ip_address = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Create audit record
    await base44.asServiceRole.entities.InvoiceAudit.create({
      invoice_id,
      action,
      changed_fields: changed_fields || [],
      old_values: old_values || {},
      new_values: new_values || {},
      performed_by: user.email,
      ip_address,
      user_agent
    });

    return Response.json({
      status: 'success',
      audit_logged: true
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});