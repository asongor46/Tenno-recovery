import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * AGREEMENT GENERATOR
 * Generates remodeled agreement with case-specific merge fields and PDF
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, template_id, send_email } = await req.json();

    if (!case_id) {
      return Response.json({ 
        status: 'error',
        details: 'case_id required' 
      }, { status: 400 });
    }

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    // Fetch template (use default if not specified)
    let template;
    if (template_id) {
      const templates = await base44.entities.AgreementTemplate.filter({ id: template_id });
      template = templates[0];
    } else {
      const templates = await base44.entities.AgreementTemplate.filter({ is_default: true, is_active: true });
      template = templates[0];
      if (!template) {
        const allTemplates = await base44.entities.AgreementTemplate.filter({ is_active: true });
        template = allTemplates[0];
      }
    }

    // Fallback to built-in template if none found
    let agreementTemplate;
    if (template) {
      agreementTemplate = template.template_body;
    } else {
      agreementTemplate = `
SURPLUS FUNDS RECOVERY AGREEMENT

This Agreement is made on {DATE} between:

PROPERTY OWNER: {OWNER_NAME}
Address: {OWNER_ADDRESS}

and

TENNO RECOVERY

RE: Surplus Funds from Tax Sale
Property: {PROPERTY_ADDRESS}
County: {COUNTY}, {STATE}
Case Number: {CASE_NUMBER}
Surplus Amount: ${caseData.surplus_amount?.toLocaleString() || '0'}

TERMS:

1. SERVICES: TENNO RECOVERY agrees to prepare, file, and pursue the claim for surplus funds on behalf of the Property Owner.

2. COMPENSATION: Property Owner agrees to pay TENNO RECOVERY a finder's fee of {FINDER_FEE_PERCENT}% of the total surplus funds recovered.

3. PAYMENT: Fee shall be paid within 5 business days of Property Owner receiving surplus funds from the County Treasurer.

4. AUTHORIZATION: Property Owner authorizes TENNO RECOVERY to:
   - File all necessary documents with ${caseData.county} County Court
   - Communicate with court officials and county treasurer
   - Obtain certified copies of necessary documents
   - Take all actions necessary to recover surplus funds

5. PROPERTY OWNER RESPONSIBILITIES:
   - Provide valid identification
   - Sign all required documents
   - Cooperate with notarization requirements
   - Respond to requests within 48 hours

6. REPRESENTATIONS: Property Owner represents that they are the rightful owner or authorized representative for these surplus funds.

SIGNATURES:

Property Owner: ______________________________  Date: __________
Name: {OWNER_NAME}

TENNO RECOVERY: ______________________  Date: __________
`;
    }

    // Calculate fee amount and net
    const feePercent = caseData.fee_percent || 20;
    const surplusAmount = caseData.surplus_amount || 0;
    const feeAmount = surplusAmount * (feePercent / 100);
    const homeownerNet = surplusAmount - feeAmount;

    // Fill merge fields
    const filledAgreement = agreementTemplate
      .replace(/{DATE}/g, new Date().toLocaleDateString())
      .replace(/{OWNER_NAME}/g, caseData.owner_name || '[NAME]')
      .replace(/{OWNER_ADDRESS}/g, caseData.owner_address || '[ADDRESS]')
      .replace(/{PROPERTY_ADDRESS}/g, caseData.property_address || '[PROPERTY]')
      .replace(/{COUNTY}/g, caseData.county || '[COUNTY]')
      .replace(/{STATE}/g, caseData.state || '[STATE]')
      .replace(/{CASE_NUMBER}/g, caseData.case_number || '[CASE]')
      .replace(/{FINDER_FEE_PERCENT}/g, feePercent.toString())
      .replace(/{FINDER_FEE_AMOUNT}/g, '$' + feeAmount.toLocaleString())
      .replace(/{SURPLUS_AMOUNT}/g, '$' + surplusAmount.toLocaleString())
      .replace(/{HOMEOWNER_NET}/g, '$' + homeownerNet.toLocaleString())
      .replace(/{SALE_DATE}/g, caseData.sale_date ? new Date(caseData.sale_date).toLocaleDateString() : '[SALE_DATE]');

    // Generate PDF
    const doc = new jsPDF();
    
    // Add content to PDF
    doc.setFontSize(16);
    doc.text('SURPLUS FUNDS RECOVERY AGREEMENT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    const lines = filledAgreement.split('\n');
    let y = 35;
    const pageHeight = doc.internal.pageSize.height;
    
    for (const line of lines) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      
      const wrappedLines = doc.splitTextToSize(line || ' ', 170);
      doc.text(wrappedLines, 20, y);
      y += wrappedLines.length * 5;
    }
    
    // Save PDF to temp file
    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], `agreement-${caseData.case_number}.pdf`, { type: 'application/pdf' });
    
    // Upload PDF
    const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // Create document record
    await base44.entities.Document.create({
      case_id,
      name: `Agreement - ${caseData.case_number}`,
      category: 'agreement',
      file_url: pdfUrl,
      file_type: 'application/pdf',
      uploaded_by: 'system',
      is_primary: true,
    });

    // Update agreement status and calculate amounts (fee locks on signature, not generation)
    await base44.entities.Case.update(case_id, {
      agreement_status: send_email ? 'sent' : 'not_sent',
      agreement_sent_at: send_email ? new Date().toISOString() : null,
      fee_amount: feeAmount,
      homeowner_net: homeownerNet,
      fee_locked: false, // Will lock when homeowner signs
    });

    // Send email if requested
    if (send_email && caseData.owner_email) {
      await base44.integrations.Core.SendEmail({
        to: caseData.owner_email,
        subject: `Surplus Funds Recovery Agreement - ${caseData.case_number}`,
        body: `Dear ${caseData.owner_name},

Please find your Surplus Funds Recovery Agreement below. 

To proceed:
1. Review the agreement carefully
2. Access your secure portal: [PORTAL_LINK]
3. Sign electronically
4. Upload required documents

Agreement:

${filledAgreement}

If you have questions, please reply to this email.

Best regards,
TENNO RECOVERY`
      });
    }

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: send_email ? 'agreement_sent' : 'agreement_generated',
      description: `Agreement generated with ${feePercent}% fee (locks on signature)`,
      performed_by: user.email,
      metadata: { 
        fee_percent: feePercent,
        fee_amount: feeAmount,
        homeowner_net: homeownerNet
      }
    });

    return Response.json({
      status: 'success',
      agreement_text: filledAgreement,
      fee_amount: feeAmount,
      sent_email: send_email,
      template_used: template?.name || 'Built-in Default',
      pdf_url: pdfUrl,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});