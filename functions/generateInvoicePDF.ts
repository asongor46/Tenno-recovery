import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * INVOICE PDF GENERATOR
 * Generates professional invoice PDFs with line items
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return Response.json({ 
        status: 'error',
        details: 'invoice_id required' 
      }, { status: 400 });
    }

    // Fetch invoice
    const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    
    if (!invoice) {
      return Response.json({ 
        status: 'error',
        details: 'Invoice not found' 
      }, { status: 404 });
    }

    // Fetch line items
    const items = await base44.entities.InvoiceItem.filter({ invoice_id }, 'order');

    // Generate PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(31, 41, 55);
    doc.text('INVOICE', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('TENNO Recovery', 20, 28);
    doc.text('Surplus Fund Recovery Services', 20, 33);
    
    // Invoice details
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 140, 20);
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 140, 25);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 140, 30);
    
    const statusColor = 
      invoice.status === 'paid' ? [16, 185, 129] :
      invoice.status === 'overdue' ? [239, 68, 68] :
      [59, 130, 246];
    doc.setTextColor(...statusColor);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 140, 35);
    
    // Bill To
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 50);
    doc.setFontSize(10);
    doc.text(invoice.client_name, 20, 57);
    if (invoice.client_email) {
      doc.text(invoice.client_email, 20, 62);
    }
    if (invoice.client_address) {
      const addressLines = invoice.client_address.split('\n');
      addressLines.forEach((line, i) => {
        doc.text(line, 20, 67 + (i * 5));
      });
    }
    
    // Table header
    let y = 90;
    doc.setFillColor(241, 245, 249);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Description', 22, y + 5);
    doc.text('Qty', 130, y + 5);
    doc.text('Rate', 150, y + 5);
    doc.text('Amount', 175, y + 5);
    
    // Line items
    y += 12;
    doc.setTextColor(31, 41, 55);
    items.forEach((item) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(item.description, 22, y);
      doc.text(String(item.quantity || 1), 130, y);
      doc.text(`$${item.unit_price.toLocaleString()}`, 150, y);
      doc.text(`$${item.amount.toLocaleString()}`, 175, y);
      y += 7;
    });
    
    // Totals
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(20, y, 190, y);
    y += 8;
    
    doc.text('Subtotal:', 140, y);
    doc.text(`$${invoice.subtotal.toLocaleString()}`, 175, y);
    y += 7;
    
    if (invoice.tax_amount > 0) {
      doc.text(`Tax (${invoice.tax_rate}%):`, 140, y);
      doc.text(`$${invoice.tax_amount.toLocaleString()}`, 175, y);
      y += 7;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Total:', 140, y);
    doc.text(`$${invoice.total_amount.toLocaleString()}`, 175, y);
    y += 7;
    
    if (invoice.amount_paid > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Paid:', 140, y);
      doc.text(`$${invoice.amount_paid.toLocaleString()}`, 175, y);
      y += 7;
      
      doc.setFont(undefined, 'bold');
      doc.text('Balance Due:', 140, y);
      doc.text(`$${invoice.balance_due.toLocaleString()}`, 175, y);
    }
    
    // Terms
    if (invoice.terms) {
      y += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Terms & Conditions:', 20, y);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(71, 85, 105);
      const termsLines = doc.splitTextToSize(invoice.terms, 170);
      doc.text(termsLines, 20, y + 5);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });
    
    // Save to file
    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], `invoice_${invoice.invoice_number}.pdf`, { type: 'application/pdf' });
    
    // Upload to storage
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    
    // Update invoice with PDF URL
    await base44.asServiceRole.entities.Invoice.update(invoice_id, { pdf_url: file_url });
    
    // Audit log
    await base44.asServiceRole.entities.InvoiceAudit.create({
      invoice_id,
      action: 'updated',
      changed_fields: ['pdf_url'],
      new_values: { pdf_url: file_url },
      performed_by: user.email
    });

    return Response.json({
      status: 'success',
      pdf_url: file_url
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});