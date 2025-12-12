import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUTO-ASSIGN COUNTY FORMS TO CASE
 * When a case is created or county is updated, this function:
 * - Reads county rules
 * - Fetches applicable county form templates
 * - Auto-selects which forms apply based on stage and requirements
 * - Returns a smart checklist of what's needed
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

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

    // Fetch county
    const counties = await base44.entities.County.filter({
      name: caseData.county,
      state: caseData.state
    });
    const county = counties[0];

    if (!county) {
      return Response.json({
        status: 'success',
        message: 'No county profile found, using default requirements',
        requirements: getDefaultRequirements(caseData)
      });
    }

    // Fetch county forms
    const countyForms = await base44.entities.CountyFormTemplate.filter({
      county_id: county.id,
      is_active: true
    });

    // Determine which forms are required based on case stage and county rules
    const requiredForms = [];
    const optionalForms = [];
    
    for (const form of countyForms) {
      const requirement = determineFormRequirement(form, caseData, county);
      
      if (requirement.required) {
        requiredForms.push({
          form_id: form.id,
          form_name: form.form_name,
          form_type: form.form_type,
          requires_notary: form.requires_notary,
          stage_needed: requirement.stage,
          filled_by: requirement.filled_by,
          template_url: form.file_url,
          merge_fields: form.merge_fields || [],
          order: form.order || 0
        });
      } else {
        optionalForms.push({
          form_id: form.id,
          form_name: form.form_name,
          form_type: form.form_type
        });
      }
    }

    // Sort by order
    requiredForms.sort((a, b) => a.order - b.order);

    // Generate checklist
    const checklist = generateSmartChecklist(caseData, county, requiredForms);

    return Response.json({
      status: 'success',
      county_name: county.name,
      county_rules: {
        notary_required: county.notary_required,
        notary_type: county.notary_type,
        notary_format: county.notary_format,
        requires_separate_notary_page: county.requires_separate_notary_page,
        filing_method: county.filing_method,
        rep_allowed: county.rep_allowed,
        assignment_required: county.assignment_required
      },
      required_forms: requiredForms,
      optional_forms: optionalForms,
      checklist,
      ready_for_packet: checklist.every(item => item.complete)
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function determineFormRequirement(form, caseData, county) {
  // Application forms - always required
  if (form.form_type === 'application') {
    return {
      required: true,
      stage: 'packet_ready',
      filled_by: 'agent'
    };
  }

  // Affidavit - required if county requires
  if (form.form_type === 'affidavit') {
    return {
      required: true,
      stage: 'packet_ready',
      filled_by: 'agent'
    };
  }

  // Cover sheet - required for certain filing methods
  if (form.form_type === 'cover_sheet') {
    return {
      required: county.filing_method === 'efile' || county.filing_method === 'mail',
      stage: 'packet_ready',
      filled_by: 'agent'
    };
  }

  // Order - needed after waiting period
  if (form.form_type === 'order') {
    return {
      required: true,
      stage: 'filed',
      filled_by: 'agent'
    };
  }

  // Default - optional
  return {
    required: false,
    stage: null,
    filled_by: null
  };
}

function generateSmartChecklist(caseData, county, requiredForms) {
  const checklist = [];

  // 1. Agreement
  checklist.push({
    item: 'Signed Agreement',
    complete: caseData.agreement_status === 'signed',
    stage: 'agreement_signed',
    type: 'document'
  });

  // 2. Owner Info
  checklist.push({
    item: 'Complete Owner Information',
    complete: !!(caseData.owner_email && caseData.owner_phone && caseData.owner_address),
    stage: 'info_completed',
    type: 'data'
  });

  // 3. ID Documents
  checklist.push({
    item: 'Owner ID (Front & Back)',
    complete: !!(caseData.id_front_url && caseData.id_back_url),
    stage: 'info_completed',
    type: 'document'
  });

  // 4. Notary (if required by county)
  if (county.notary_required) {
    checklist.push({
      item: `Notarized Document (${county.notary_type})`,
      complete: caseData.notary_status === 'approved' || caseData.notary_status === 'uploaded',
      stage: 'notary_completed',
      type: 'document',
      details: county.requires_separate_notary_page ? 'Separate page required' : null
    });
  }

  // 5. County-specific forms
  for (const form of requiredForms) {
    if (form.stage_needed === 'packet_ready') {
      checklist.push({
        item: form.form_name,
        complete: false, // Will be checked against actual documents
        stage: 'packet_ready',
        type: 'form',
        form_id: form.form_id
      });
    }
  }

  return checklist;
}

function getDefaultRequirements(caseData) {
  return {
    notary_required: true,
    forms_needed: ['Application', 'Affidavit'],
    id_required: true,
    agreement_required: true
  };
}