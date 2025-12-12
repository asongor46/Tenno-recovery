import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AGREEMENT GENERATOR
 * Generates remodeled agreement with case-specific merge fields
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

TENNO RECOVERY SERVICES

RE: Surplus Funds from Tax Sale
Property: {PROPERTY_ADDRESS}
County: {COUNTY}, {STATE}
Case Number: {CASE_NUMBER}
Surplus Amount: ${caseData.surplus_amount?.toLocaleString() || '0'}

TERMS:

1. SERVICES: TENNO Recovery Services agrees to prepare, file, and pursue the claim for surplus funds on behalf of the Property Owner.

2. COMPENSATION: Property Owner agrees to pay TENNO Recovery Services a finder's fee of {FINDER_FEE_PERCENT}% of the total surplus funds recovered.

3. PAYMENT: Fee shall be paid within 5 business days of Property Owner receiving surplus funds from the County Treasurer.

4. AUTHORIZATION: Property Owner authorizes TENNO Recovery Services to:
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

TENNO Recovery Services: ______________________  Date: __________
`;
    }

    // Calculate fee amount
    const feeAmount = (caseData.surplus_amount || 0) * ((caseData.fee_percentage || 20) / 100);

    // Fill merge fields
    const filledAgreement = agreementTemplate
      .replace(/{DATE}/g, new Date().toLocaleDateString())
      .replace(/{OWNER_NAME}/g, caseData.owner_name || '[NAME]')
      .replace(/{OWNER_ADDRESS}/g, caseData.owner_address || '[ADDRESS]')
      .replace(/{PROPERTY_ADDRESS}/g, caseData.property_address || '[PROPERTY]')
      .replace(/{COUNTY}/g, caseData.county || '[COUNTY]')
      .replace(/{STATE}/g, caseData.state || '[STATE]')
      .replace(/{CASE_NUMBER}/g, caseData.case_number || '[CASE]')
      .replace(/{FINDER_FEE_PERCENT}/g, (caseData.fee_percentage || 20).toString())
      .replace(/{FINDER_FEE_AMOUNT}/g, feeAmount.toLocaleString())
      .replace(/{SURPLUS_AMOUNT}/g, (caseData.surplus_amount || 0).toLocaleString())
      .replace(/{SALE_DATE}/g, caseData.sale_date ? new Date(caseData.sale_date).toLocaleDateString() : '[SALE_DATE]');

    // Update case status
    await base44.entities.Case.update(case_id, {
      agreement_status: send_email ? 'sent' : 'not_sent',
      agreement_sent_at: send_email ? new Date().toISOString() : null,
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
TENNO Recovery Services`
      });
    }

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: send_email ? 'agreement_sent' : 'agreement_generated',
      description: `Agreement generated with ${caseData.fee_percentage}% fee`,
      performed_by: user.email,
      metadata: { fee_percentage: caseData.fee_percentage }
    });

    return Response.json({
      status: 'success',
      agreement_text: filledAgreement,
      fee_amount: feeAmount,
      sent_email: send_email,
      template_used: template?.name || 'Built-in Default',
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});