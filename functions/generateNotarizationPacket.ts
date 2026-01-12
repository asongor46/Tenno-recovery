import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

    if (!case_id) {
      return Response.json({ error: 'case_id is required' }, { status: 400 });
    }

    // Fetch case data
    const cases = await base44.entities.Case.filter({ id: case_id });
    if (cases.length === 0) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }
    const caseData = cases[0];

    // Verify prerequisites
    if (caseData.agreement_status !== 'signed') {
      return Response.json({ 
        error: 'Agreement must be signed before generating notarization packet',
        status: 'blocked'
      }, { status: 400 });
    }

    if (!caseData.fee_locked) {
      return Response.json({ 
        error: 'Fee must be locked before generating notarization packet',
        status: 'blocked'
      }, { status: 400 });
    }

    // Fetch all documents requiring notarization
    const allDocuments = await base44.asServiceRole.entities.Document.filter({ 
      case_id: case_id 
    });

    const notaryDocs = allDocuments.filter(doc => {
      // Agreement signature page
      if (doc.category === 'agreement' && doc.is_primary) return true;
      
      // County-required affidavits
      if (doc.category === 'affidavit') return true;
      
      // Assignment documents
      if (doc.category === 'assignment') return true;
      
      // Authorization forms
      if (doc.category === 'authorization') return true;
      
      return false;
    });

    if (notaryDocs.length === 0) {
      return Response.json({ 
        error: `No notarization forms configured for ${caseData.county} County, ${caseData.state}. Please contact support to have forms prepared for your county.`,
        status: 'no_docs',
        missing_forms: true
      }, { status: 400 });
    }

    // Create merged PDF
    const doc = new jsPDF();
    let currentPage = 1;

    // Add cover page with instructions
    doc.setFontSize(18);
    doc.text('NOTARIZATION PACKET', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Case: ${caseData.case_number}`, 20, 50);
    doc.text(`Owner: ${caseData.owner_name}`, 20, 60);
    doc.text(`Property: ${caseData.property_address || 'N/A'}`, 20, 70);
    doc.text(`County: ${caseData.county}, ${caseData.state || ''}`, 20, 80);
    
    doc.setFontSize(14);
    doc.text('IMPORTANT INSTRUCTIONS', 20, 100);
    
    doc.setFontSize(10);
    const instructions = [
      '1. PRINT this entire packet (all pages)',
      '2. BRING this packet and a valid government-issued ID to a notary public',
      '3. SIGN all signature lines in the presence of the notary',
      '4. NOTARY will complete their section with stamp and signature',
      '5. UPLOAD the complete notarized packet back to the portal',
      '',
      'DO NOT SIGN before visiting the notary - signatures must be witnessed!',
      '',
      'Documents requiring notarization in this packet:'
    ];
    
    let yPos = 110;
    instructions.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 7;
    });

    // List documents
    notaryDocs.forEach((docItem, idx) => {
      doc.text(`   ${idx + 1}. ${docItem.name} (${docItem.category})`, 20, yPos);
      yPos += 7;
    });

    doc.setFontSize(9);
    doc.text('Generated: ' + new Date().toLocaleString(), 20, 280);
    doc.text(`Fee Locked at ${caseData.fee_percent}%`, 20, 287);

    // Add document pages
    // Note: In production, you'd fetch the actual PDFs and merge them
    // For now, we'll add placeholder pages
    for (let i = 0; i < notaryDocs.length; i++) {
      doc.addPage();
      doc.setFontSize(12);
      doc.text(`Document ${i + 1}: ${notaryDocs[i].name}`, 20, 30);
      doc.setFontSize(10);
      doc.text('(Actual document content would be merged here)', 20, 50);
      doc.text(`Category: ${notaryDocs[i].category}`, 20, 70);
      doc.text('Signature Line: _________________________________', 20, 250);
      doc.text('Date: _____________', 20, 260);
    }

    // Add notary certificate page
    doc.addPage();
    doc.setFontSize(14);
    doc.text('NOTARY CERTIFICATE', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    const notaryText = [
      'State of: _____________________',
      'County of: ____________________',
      '',
      'On this _____ day of _____________, 20___,',
      'before me personally appeared:',
      '',
      `${caseData.owner_name}`,
      '',
      'known to me (or satisfactorily proven) to be the person whose name is',
      'subscribed to the within instrument and acknowledged that they executed',
      'the same for the purposes therein contained.',
      '',
      'IN WITNESS WHEREOF, I have hereunto set my hand and affixed my official seal.',
      '',
      '',
      'Notary Public Signature: _________________________________',
      '',
      'Print Name: _________________________________',
      '',
      'Commission Number: _________________________________',
      '',
      'My Commission Expires: _________________________________',
      '',
      '(NOTARY SEAL/STAMP HERE)'
    ];

    yPos = 50;
    notaryText.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 10;
    });

    // Generate PDF buffer
    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], `notarization_packet_${caseData.case_number}.pdf`, {
      type: 'application/pdf'
    });

    // Upload to storage
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ 
      file: pdfFile 
    });

    // Create hash for version control
    const encoder = new TextEncoder();
    const data = encoder.encode(file_url + caseData.fee_percent + caseData.agreement_signed_at);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const versionHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Update case with packet info
    await base44.asServiceRole.entities.Case.update(case_id, {
      notary_packet_generated: true,
      notary_packet_url: file_url,
      notary_packet_generated_at: new Date().toISOString(),
      notary_packet_version_hash: versionHash,
      notary_status: 'pending',
      fee_locked: true // Ensure fee stays locked
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      case_id: case_id,
      action: 'Notarization Packet Generated',
      description: `Generated notarization packet with ${notaryDocs.length} documents requiring notarization`,
      performed_by: user.email,
      metadata: {
        document_count: notaryDocs.length,
        version_hash: versionHash
      }
    });

    return Response.json({
      status: 'success',
      packet_url: file_url,
      document_count: notaryDocs.length,
      version_hash: versionHash,
      documents: notaryDocs.map(d => ({
        name: d.name,
        category: d.category
      }))
    });

  } catch (error) {
    console.error('Error generating notarization packet:', error);
    return Response.json({ 
      error: error.message,
      status: 'error'
    }, { status: 500 });
  }
});