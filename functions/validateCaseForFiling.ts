// =====================================================
// PRE-FILING VALIDATION ENGINE
// =====================================================
// Central validation before ANY packet is filed
// Returns: is_ready_to_file + structured errors/warnings

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ADDED: Error code definitions
const ERROR_CODES = {
  MISSING_AGREEMENT_SIGNED: {
    severity: 'error',
    message: 'Agreement has not been signed by homeowner',
    category: 'agreement',
  },
  MISSING_ID_UPLOAD: {
    severity: 'error',
    message: 'Homeowner ID (front and back) not uploaded',
    category: 'identity',
  },
  ID_NAME_MISMATCH: {
    severity: 'error',
    message: 'Name on ID does not match case owner name',
    category: 'identity',
  },
  ID_EXPIRED: {
    severity: 'error',
    message: 'Uploaded ID has expired',
    category: 'identity',
  },
  MISSING_NOTARY_PAGE: {
    severity: 'error',
    message: 'Notarized document not uploaded',
    category: 'notary',
  },
  NOTARY_FORMAT_INVALID: {
    severity: 'error',
    message: 'Notary format does not meet county requirements',
    category: 'notary',
  },
  NOTARY_SEAL_MISSING: {
    severity: 'error',
    message: 'Notary seal not visible or missing',
    category: 'notary',
  },
  NOTARY_RON_NOT_ALLOWED: {
    severity: 'error',
    message: 'County does not accept RON; wet ink required',
    category: 'notary',
  },
  REQUIRED_FORM_MISSING: {
    severity: 'error',
    message: 'Required county form is missing from packet',
    category: 'forms',
  },
  COUNTY_DOES_NOT_ALLOW_REP: {
    severity: 'error',
    message: 'County does not allow representative filing',
    category: 'county_rules',
  },
  ASSIGNMENT_REQUIRED: {
    severity: 'error',
    message: 'County requires assignment document',
    category: 'county_rules',
  },
  CLAIM_DEADLINE_EXPIRED: {
    severity: 'error',
    message: 'Claim deadline has passed',
    category: 'deadline',
  },
  CLAIM_DEADLINE_APPROACHING: {
    severity: 'warning',
    message: 'Claim deadline is within 7 days',
    category: 'deadline',
  },
  SURPLUS_ALREADY_CLAIMED: {
    severity: 'error',
    message: 'Surplus has already been claimed by another party',
    category: 'eligibility',
  },
  OWNER_NOT_VERIFIED: {
    severity: 'warning',
    message: 'Owner identity has not been fully verified',
    category: 'verification',
  },
  MISSING_INTAKE_DATA: {
    severity: 'warning',
    message: 'Homeowner intake questionnaire incomplete',
    category: 'intake',
  },
  NAME_VARIATION_DETECTED: {
    severity: 'warning',
    message: 'Signed name varies from deed name',
    category: 'identity',
  },
};

// ADDED: Main validation function
async function validateCase(caseId, base44) {
  const errors = [];
  const warnings = [];
  
  // ADDED: Fetch case data
  const cases = await base44.asServiceRole.entities.Case.filter({ id: caseId });
  const caseData = cases[0];
  
  if (!caseData) {
    throw new Error('Case not found');
  }
  
  // ADDED: Fetch county rules
  const counties = await base44.asServiceRole.entities.County.filter({
    name: caseData.county,
    state: caseData.state,
  });
  const countyData = counties[0];
  
  // ADDED: Fetch documents
  const documents = await base44.asServiceRole.entities.Document.filter({
    case_id: caseId,
  });
  
  // ADDED: Fetch homeowner workflow steps
  const steps = await base44.asServiceRole.entities.HomeownerStep.filter({
    case_id: caseId,
  });
  
  // ========================================
  // VALIDATION CHECK #1: Agreement Signed
  // ========================================
  const agreementStep = steps.find(s => s.step_key === 'agreement');
  const hasSignedAgreement = caseData.agreement_signed_at || agreementStep?.status === 'completed';
  
  if (!hasSignedAgreement) {
    errors.push({
      code: 'MISSING_AGREEMENT_SIGNED',
      ...ERROR_CODES.MISSING_AGREEMENT_SIGNED,
      field: 'agreement',
    });
  }
  
  // ========================================
  // VALIDATION CHECK #2: ID Upload
  // ========================================
  const idFront = documents.find(d => d.category === 'id_front');
  const idBack = documents.find(d => d.category === 'id_back');
  
  if (!idFront || !idBack) {
    errors.push({
      code: 'MISSING_ID_UPLOAD',
      ...ERROR_CODES.MISSING_ID_UPLOAD,
      field: 'id_documents',
      details: {
        has_front: !!idFront,
        has_back: !!idBack,
      },
    });
  }
  
  // ADDED: Check ID expiration (if ID uploaded)
  if (idFront && idFront.metadata?.expiration_date) {
    const expirationDate = new Date(idFront.metadata.expiration_date);
    if (expirationDate < new Date()) {
      errors.push({
        code: 'ID_EXPIRED',
        ...ERROR_CODES.ID_EXPIRED,
        field: 'id_front',
        details: {
          expiration_date: idFront.metadata.expiration_date,
        },
      });
    }
  }
  
  // ========================================
  // VALIDATION CHECK #3: Name Matching
  // ========================================
  // TODO: Implement actual name extraction and comparison
  // For now, check if names are present
  const hasOwnerName = !!caseData.owner_name;
  const idName = idFront?.metadata?.extracted_name;
  
  if (hasOwnerName && idName && idName !== caseData.owner_name) {
    warnings.push({
      code: 'NAME_VARIATION_DETECTED',
      ...ERROR_CODES.NAME_VARIATION_DETECTED,
      field: 'owner_name',
      details: {
        case_name: caseData.owner_name,
        id_name: idName,
      },
    });
  }
  
  // ========================================
  // VALIDATION CHECK #4: Notary Requirements
  // ========================================
  if (countyData?.notary_required) {
    const notaryDoc = documents.find(d => d.category === 'notary_page');
    
    if (!notaryDoc) {
      errors.push({
        code: 'MISSING_NOTARY_PAGE',
        ...ERROR_CODES.MISSING_NOTARY_PAGE,
        field: 'notary_document',
      });
    } else {
      // ADDED: Check notary format compliance
      if (countyData.notary_type === 'wet' && notaryDoc.metadata?.notary_type === 'ron') {
        errors.push({
          code: 'NOTARY_RON_NOT_ALLOWED',
          ...ERROR_CODES.NOTARY_RON_NOT_ALLOWED,
          field: 'notary_document',
          details: {
            county_requires: 'wet',
            document_has: 'ron',
          },
        });
      }
      
      // ADDED: Check seal presence (from validation results)
      if (notaryDoc.metadata?.validation?.issues) {
        const sealIssue = notaryDoc.metadata.validation.issues.find(i => i.type === 'missing_seal');
        if (sealIssue) {
          errors.push({
            code: 'NOTARY_SEAL_MISSING',
            ...ERROR_CODES.NOTARY_SEAL_MISSING,
            field: 'notary_document',
          });
        }
      }
    }
  }
  
  // ========================================
  // VALIDATION CHECK #5: County Rules
  // ========================================
  if (countyData) {
    // Check if rep allowed
    if (!countyData.rep_allowed) {
      errors.push({
        code: 'COUNTY_DOES_NOT_ALLOW_REP',
        ...ERROR_CODES.COUNTY_DOES_NOT_ALLOW_REP,
        field: 'county_rules',
        details: {
          county: caseData.county,
        },
      });
    }
    
    // Check if assignment required
    if (countyData.assignment_required) {
      const assignmentDoc = documents.find(d => d.category === 'assignment');
      if (!assignmentDoc) {
        errors.push({
          code: 'ASSIGNMENT_REQUIRED',
          ...ERROR_CODES.ASSIGNMENT_REQUIRED,
          field: 'assignment_document',
        });
      }
    }
  }
  
  // ========================================
  // VALIDATION CHECK #6: Claim Deadline
  // ========================================
  if (caseData.sale_date && countyData?.claim_deadline_days) {
    const saleDate = new Date(caseData.sale_date);
    const deadlineDays = countyData.claim_deadline_days;
    const deadlineDate = new Date(saleDate);
    deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);
    
    const today = new Date();
    const daysUntilDeadline = Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) {
      errors.push({
        code: 'CLAIM_DEADLINE_EXPIRED',
        ...ERROR_CODES.CLAIM_DEADLINE_EXPIRED,
        field: 'deadline',
        details: {
          deadline_date: deadlineDate.toISOString().split('T')[0],
          days_overdue: Math.abs(daysUntilDeadline),
        },
      });
    } else if (daysUntilDeadline <= 7) {
      warnings.push({
        code: 'CLAIM_DEADLINE_APPROACHING',
        ...ERROR_CODES.CLAIM_DEADLINE_APPROACHING,
        field: 'deadline',
        details: {
          deadline_date: deadlineDate.toISOString().split('T')[0],
          days_remaining: daysUntilDeadline,
        },
      });
    }
  }
  
  // ========================================
  // VALIDATION CHECK #7: Owner Verification
  // ========================================
  if (caseData.owner_confidence === 'low' || caseData.owner_confidence === 'unknown') {
    warnings.push({
      code: 'OWNER_NOT_VERIFIED',
      ...ERROR_CODES.OWNER_NOT_VERIFIED,
      field: 'owner_verification',
      details: {
        confidence: caseData.owner_confidence,
      },
    });
  }
  
  // ========================================
  // VALIDATION CHECK #8: Required Forms
  // ========================================
  // TODO: Check against CountyPacketProfile when implemented
  
  // ADDED: Calculate overall readiness
  const isReadyToFile = errors.length === 0;
  const hasWarnings = warnings.length > 0;
  
  return {
    is_ready_to_file: isReadyToFile,
    can_file_with_warnings: errors.length === 0 && hasWarnings,
    total_errors: errors.length,
    total_warnings: warnings.length,
    errors,
    warnings,
    validation_summary: {
      agreement: hasSignedAgreement ? 'pass' : 'fail',
      identity: idFront && idBack ? 'pass' : 'fail',
      notary: countyData?.notary_required ? (documents.some(d => d.category === 'notary_page') ? 'pass' : 'fail') : 'not_required',
      deadline: errors.some(e => e.code === 'CLAIM_DEADLINE_EXPIRED') ? 'fail' : 'pass',
      county_rules: errors.some(e => e.category === 'county_rules') ? 'fail' : 'pass',
    },
    next_actions: generateNextActions(errors, warnings),
  };
}

// ADDED: Generate actionable next steps
function generateNextActions(errors, warnings) {
  const actions = [];
  
  // Prioritize errors first
  if (errors.some(e => e.code === 'CLAIM_DEADLINE_EXPIRED')) {
    actions.push({
      priority: 'critical',
      action: 'Contact county immediately - deadline may be past',
      category: 'deadline',
    });
  }
  
  if (errors.some(e => e.code === 'MISSING_AGREEMENT_SIGNED')) {
    actions.push({
      priority: 'high',
      action: 'Send portal link to homeowner for agreement signing',
      category: 'agreement',
    });
  }
  
  if (errors.some(e => e.code === 'MISSING_ID_UPLOAD')) {
    actions.push({
      priority: 'high',
      action: 'Request ID upload from homeowner via portal',
      category: 'identity',
    });
  }
  
  if (errors.some(e => e.code === 'MISSING_NOTARY_PAGE')) {
    actions.push({
      priority: 'high',
      action: 'Send notary instructions to homeowner',
      category: 'notary',
    });
  }
  
  if (warnings.some(w => w.code === 'NAME_VARIATION_DETECTED')) {
    actions.push({
      priority: 'medium',
      action: 'Verify name variation is acceptable (maiden name, middle initial, etc.)',
      category: 'identity',
    });
  }
  
  if (actions.length === 0) {
    actions.push({
      priority: 'low',
      action: 'Case ready to file - proceed with packet generation',
      category: 'filing',
    });
  }
  
  return actions;
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

    // ADDED: Run full validation
    const validationResult = await validateCase(case_id, base44);

    return Response.json({
      status: 'success',
      case_id,
      ...validationResult,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});