// =====================================================
// AUTOMATION OPPORTUNITY 1.5 - AUTOMATIC PACKET BUILDER
// =====================================================
// Auto-generates complete filing packets based on county rules
// Includes: required forms, auto-fill, notary blocks, cover sheets

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ADDED: County-specific packet requirements
const COUNTY_PACKET_RULES = {
  'Broward': {
    required_documents: [
      { type: 'claim_form', template_id: 'broward_claim_form' },
      { type: 'claimant_affidavit', template_id: 'broward_affidavit' },
      { type: 'id_front', source: 'homeowner_upload' },
      { type: 'id_back', source: 'homeowner_upload' },
      { type: 'signed_agreement', source: 'homeowner_upload' },
      { type: 'notary_page', source: 'homeowner_upload' },
      { type: 'cover_sheet', template_id: 'broward_cover' },
    ],
    notary_required: true,
    notary_type: 'either', // wet or RON
    representative_allowed: true,
    assignment_required: false,
    filing_address: '201 SE 6th St, Fort Lauderdale, FL 33301',
    special_notes: 'All documents must be single-sided',
  },
  'Miami-Dade': {
    required_documents: [
      { type: 'claim_form', template_id: 'miami_claim_form' },
      { type: 'w9', template_id: 'generic_w9' },
      { type: 'id_front', source: 'homeowner_upload' },
      { type: 'signed_agreement', source: 'homeowner_upload' },
      { type: 'notary_page', source: 'homeowner_upload' },
    ],
    notary_required: true,
    notary_type: 'wet', // Only wet ink
    representative_allowed: true,
    assignment_required: true,
    filing_address: '73 W Flagler St, Miami, FL 33130',
  },
  // ADDED: Default template for unknown counties
  'default': {
    required_documents: [
      { type: 'claim_form', template_id: 'generic_claim_form' },
      { type: 'id_front', source: 'homeowner_upload' },
      { type: 'signed_agreement', source: 'homeowner_upload' },
    ],
    notary_required: true,
    notary_type: 'either',
    representative_allowed: true,
    assignment_required: false,
  },
};

// ADDED: Auto-fill form data
function generateFormData(caseData, countyRules) {
  return {
    // Case details
    case_number: caseData.case_number,
    
    // Owner information
    owner_name: caseData.owner_name,
    owner_address: caseData.owner_address,
    owner_phone: caseData.owner_phone,
    owner_email: caseData.owner_email,
    
    // Property details
    property_address: caseData.property_address,
    parcel_number: caseData.parcel_number,
    
    // Financial information
    surplus_amount: caseData.surplus_amount,
    sale_amount: caseData.sale_amount,
    sale_date: caseData.sale_date,
    
    // County information
    county: caseData.county,
    state: caseData.state,
    filing_address: countyRules.filing_address,
    
    // Representative information (your company)
    rep_company: 'TENNO RECOVERY',
    rep_address: 'Your Company Address',
    rep_phone: 'Your Company Phone',
    
    // Dates
    today_date: new Date().toLocaleDateString(),
    
    // ADDED: Notary information (if available)
    notary_name: caseData.notary_name,
    notary_commission: caseData.notary_commission,
    notary_expiration: caseData.notary_expiration,
    notary_date: caseData.notary_date,
  };
}

// ADDED: Generate packet structure
async function buildPacket(caseId, base44) {
  // Fetch case data
  const cases = await base44.asServiceRole.entities.Case.filter({ id: caseId });
  const caseData = cases[0];
  
  if (!caseData) {
    throw new Error('Case not found');
  }
  
  // Fetch county rules
  const counties = await base44.asServiceRole.entities.County.filter({
    name: caseData.county,
    state: caseData.state,
  });
  const countyData = counties[0];
  
  // Get packet rules
  const packetRules = COUNTY_PACKET_RULES[caseData.county] || COUNTY_PACKET_RULES['default'];
  
  // ADDED: Merge county database rules with packet rules
  if (countyData) {
    packetRules.notary_required = countyData.notary_required;
    packetRules.notary_type = countyData.notary_type;
    packetRules.representative_allowed = countyData.rep_allowed;
    packetRules.assignment_required = countyData.assignment_required;
    packetRules.filing_address = countyData.filing_address;
  }
  
  // ADDED: Generate auto-filled form data
  const formData = generateFormData(caseData, packetRules);
  
  // ADDED: Fetch uploaded documents
  const uploadedDocs = await base44.asServiceRole.entities.Document.filter({
    case_id: caseId,
  });
  
  // ADDED: Build packet structure
  const packet = {
    case_id: caseId,
    county: caseData.county,
    state: caseData.state,
    
    // ADDED: Document checklist
    documents: [],
    missing_documents: [],
    
    // ADDED: Form data for auto-fill
    form_data: formData,
    
    // ADDED: County-specific rules
    rules: packetRules,
    
    // ADDED: Validation status
    is_complete: false,
    can_file: false,
    blocking_issues: [],
  };
  
  // ADDED: Check each required document
  for (const required of packetRules.required_documents) {
    if (required.source === 'homeowner_upload') {
      // Check if homeowner uploaded this document
      const uploaded = uploadedDocs.find(d => d.category === required.type);
      
      if (uploaded) {
        packet.documents.push({
          type: required.type,
          status: 'uploaded',
          file_url: uploaded.file_url,
          order: packetRules.required_documents.indexOf(required),
        });
      } else {
        packet.missing_documents.push({
          type: required.type,
          status: 'missing',
          message: `Homeowner must upload ${required.type.replace(/_/g, ' ')}`,
        });
        packet.blocking_issues.push(`Missing: ${required.type.replace(/_/g, ' ')}`);
      }
    } else if (required.template_id) {
      // Document will be auto-generated from template
      packet.documents.push({
        type: required.type,
        status: 'template',
        template_id: required.template_id,
        order: packetRules.required_documents.indexOf(required),
        auto_filled: true,
      });
    }
  }
  
  // ADDED: Check if packet is complete
  packet.is_complete = packet.missing_documents.length === 0;
  packet.can_file = packet.is_complete && packet.blocking_issues.length === 0;
  
  return packet;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request payload
    const { case_id } = await req.json();
    
    if (!case_id) {
      return Response.json({ 
        error: 'Missing required field: case_id' 
      }, { status: 400 });
    }

    // ADDED: Build packet
    const packet = await buildPacket(case_id, base44);

    return Response.json({
      status: 'success',
      packet,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});