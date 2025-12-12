import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * INVOICE AUTOMATION - Step 8
 * Auto-generate invoices when cases reach "paid" stage
 * Track payment status
 * Send automated reminders
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, case_id, invoice_id } = await req.json();

    let result;
    
    switch (action) {
      case 'auto_generate':
        result = await autoGenerateInvoice(base44, case_id, user);
        break;
      case 'send_invoice':
        result = await sendInvoice(base44, invoice_id, user);
        break;
      case 'send_reminder':
        result = await sendReminder(base44, invoice_id, user);
        break;
      case 'mark_paid':
        result = await markPaid(base44, invoice_id, user);
        break;
      case 'check_overdue':
        result = await checkOverdueInvoices(base44);
        break;
      default:
        return Response.json({ 
          status: 'error',
          details: 'Invalid action' 
        }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      result
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

async function autoGenerateInvoice(base44, case_id, user) {
  const cases = await base44.entities.Case.filter({ id: case_id });
  const caseData = cases[0];
  
  if (!caseData) {
    throw new Error('Case not found');
  }

  // Check if invoice already exists
  const existing = await base44.entities.Invoice.filter({ case_id });
  if (existing.length > 0) {
    return { message: 'Invoice already exists', invoice_id: existing[0].id };
  }

  // Generate invoice number
  const allInvoices = await base44.entities.Invoice.list('-created_date', 1);
  const lastNumber = allInvoices.length > 0 ? parseInt(allInvoices[0].invoice_number.split('-')[1]) || 0 : 0;
  const invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, '0')}`;

  // Calculate amounts
  const feePercentage = caseData.fee_percentage || 20;
  const subtotal = (caseData.surplus_amount || 0) * (feePercentage / 100);
  const taxRate = 0; // No tax by default
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  // Calculate due date (5 days after payment received)
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 5);

  // Create invoice
  const invoice = await base44.entities.Invoice.create({
    invoice_number: invoiceNumber,
    case_id,
    client_name: caseData.owner_name,
    client_email: caseData.owner_email,
    client_address: caseData.owner_address,
    invoice_date: invoiceDate.toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    amount_paid: 0,
    balance_due: totalAmount,
    status: 'draft',
    terms: 'Payment due within 5 business days of receiving surplus funds from county'
  });

  // Create invoice item
  await base44.entities.InvoiceItem.create({
    invoice_id: invoice.id,
    description: `Surplus Funds Recovery Services - ${caseData.case_number}`,
    quantity: 1,
    unit_price: subtotal,
    amount: subtotal,
    order: 1
  });

  // Audit log
  await base44.entities.InvoiceAudit.create({
    invoice_id: invoice.id,
    action: 'created',
    performed_by: user.email,
    new_values: { status: 'draft', total_amount: totalAmount }
  });

  // Update case
  await base44.entities.Case.update(case_id, {
    invoice_status: 'ready',
    invoice_amount: totalAmount
  });

  return {
    invoice_id: invoice.id,
    invoice_number: invoiceNumber,
    total_amount: totalAmount
  };
}

async function sendInvoice(base44, invoice_id, user) {
  const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
  const invoice = invoices[0];
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (!invoice.client_email) {
    throw new Error('Client email not found');
  }

  // Generate PDF
  const { data: pdfResult } = await base44.functions.invoke('generateInvoicePDF', {
    invoice_id
  });

  // Send email
  await base44.integrations.Core.SendEmail({
    to: invoice.client_email,
    subject: `Invoice ${invoice.invoice_number} - TENNO RECOVERY`,
    body: `Dear ${invoice.client_name},

Thank you for working with TENNO RECOVERY!

Your surplus funds claim has been approved and payment received. Attached is your invoice for our services.

Invoice Number: ${invoice.invoice_number}
Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
Total Amount: $${invoice.total_amount.toLocaleString()}

${invoice.terms}

Please remit payment to the address on the invoice or contact us for payment options.

View/Download Invoice: ${pdfResult.pdf_url}

Thank you for your business!

TENNO RECOVERY Team`
  });

  // Update invoice
  await base44.entities.Invoice.update(invoice_id, {
    status: 'sent',
    sent_at: new Date().toISOString()
  });

  // Audit
  await base44.entities.InvoiceAudit.create({
    invoice_id,
    action: 'sent',
    performed_by: user.email,
    new_values: { status: 'sent', sent_at: new Date().toISOString() }
  });

  return { message: 'Invoice sent', email: invoice.client_email };
}

async function sendReminder(base44, invoice_id, user) {
  const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
  const invoice = invoices[0];
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  await base44.integrations.Core.SendEmail({
    to: invoice.client_email,
    subject: `Payment Reminder - Invoice ${invoice.invoice_number}`,
    body: `Dear ${invoice.client_name},

This is a friendly reminder that payment for invoice ${invoice.invoice_number} is due.

Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
Amount Due: $${invoice.balance_due.toLocaleString()}

If you have already made payment, please disregard this reminder.

If you have questions, please contact us.

Thank you!
TENNO RECOVERY`
  });

  // Audit
  await base44.entities.InvoiceAudit.create({
    invoice_id,
    action: 'reminder_sent',
    performed_by: user.email
  });

  return { message: 'Reminder sent' };
}

async function markPaid(base44, invoice_id, user) {
  const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
  const invoice = invoices[0];
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const oldStatus = invoice.status;

  await base44.entities.Invoice.update(invoice_id, {
    status: 'paid',
    amount_paid: invoice.total_amount,
    balance_due: 0,
    payment_date: new Date().toISOString()
  });

  // Audit
  await base44.entities.InvoiceAudit.create({
    invoice_id,
    action: 'paid',
    performed_by: user.email,
    old_values: { status: oldStatus, amount_paid: 0 },
    new_values: { status: 'paid', amount_paid: invoice.total_amount }
  });

  // Update case
  if (invoice.case_id) {
    await base44.entities.Case.update(invoice.case_id, {
      invoice_status: 'paid',
      invoice_paid_at: new Date().toISOString()
    });
  }

  return { message: 'Invoice marked as paid' };
}

async function checkOverdueInvoices(base44) {
  const today = new Date().toISOString().split('T')[0];
  
  const allInvoices = await base44.entities.Invoice.filter({
    status: 'sent'
  });

  const overdue = allInvoices.filter(inv => inv.due_date < today);

  for (const invoice of overdue) {
    await base44.entities.Invoice.update(invoice.id, {
      status: 'overdue'
    });

    await base44.entities.InvoiceAudit.create({
      invoice_id: invoice.id,
      action: 'marked_overdue',
      performed_by: 'system',
      new_values: { status: 'overdue' }
    });
  }

  return {
    checked: allInvoices.length,
    overdue: overdue.length
  };
}