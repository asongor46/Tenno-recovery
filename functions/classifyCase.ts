import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CASE CLASSIFICATION ENGINE
 * Automatically classifies cases and generates risk flags
 * Outputs: VIABLE_CASE, NO_SURPLUS, BANK_CASE, DECEASED_OWNER, NEEDS_MORE_DATA
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

    // Fetch case data
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    // Initialize classification result
    const result = {
      classification_status: null,
      classification_reason: null,
      risk_flags: [],
      recommendations: []
    };

    // RULE 1: Check if surplus exists
    if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
      result.classification_status = 'NO_SURPLUS';
      result.classification_reason = 'Case has no positive surplus amount';
      result.risk_flags.push('no_surplus');
      
      await base44.entities.Case.update(case_id, result);
      
      return Response.json({
        status: 'success',
        classification: result
      });
    }

    // RULE 2: Check if owner is an individual (not bank, LLC, trust, corporation)
    const isCorporate = detectCorporateOwner(caseData.owner_name);
    if (isCorporate.is_corporate) {
      result.classification_status = 'BANK_CASE';
      result.classification_reason = `Owner is a ${isCorporate.entity_type}: ${caseData.owner_name}`;
      result.risk_flags.push('bank_llc');
      
      await base44.entities.Case.update(case_id, result);
      
      return Response.json({
        status: 'success',
        classification: result
      });
    }

    // RULE 3: Check if owner is deceased
    const isDeceased = detectDeceasedOwner(caseData.owner_name);
    if (isDeceased) {
      result.classification_status = 'DECEASED_OWNER';
      result.classification_reason = 'Owner name contains deceased indicators (Estate, Deceased, etc.)';
      result.risk_flags.push('deceased');
      result.recommendations.push('Requires estate/heir research');
      
      await base44.entities.Case.update(case_id, result);
      
      return Response.json({
        status: 'success',
        classification: result
      });
    }

    // RULE 4: Check for missing critical data
    const missingFields = [];
    if (!caseData.owner_name) missingFields.push('owner_name');
    if (!caseData.property_address) missingFields.push('property_address');
    if (!caseData.county) missingFields.push('county');
    if (!caseData.case_number) missingFields.push('case_number');
    
    if (missingFields.length > 0) {
      result.classification_status = 'NEEDS_MORE_DATA';
      result.classification_reason = `Missing critical fields: ${missingFields.join(', ')}`;
      result.risk_flags.push('missing_documents');
      
      await base44.entities.Case.update(case_id, result);
      
      return Response.json({
        status: 'success',
        classification: result
      });
    }

    // RULE 5: Check if plaintiff is a lender (risk flag only)
    if (caseData.internal_notes) {
      const plaintiffCheck = detectLenderPlaintiff(caseData.internal_notes);
      if (plaintiffCheck) {
        result.risk_flags.push('plaintiff_is_lender');
      }
    }

    // RULE 6: Check for duplicate cases
    const duplicates = await base44.entities.Case.filter({
      owner_name: caseData.owner_name,
      county: caseData.county,
      surplus_amount: caseData.surplus_amount
    });
    
    if (duplicates.length > 1) {
      result.risk_flags.push('duplicate_case');
    }

    // RULE 7: Check if case appears unclaimed (based on stage and age)
    const caseAge = caseData.created_date 
      ? Math.floor((Date.now() - new Date(caseData.created_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    if (caseAge > 90 && caseData.stage === 'imported') {
      result.risk_flags.push('stale_case');
    }

    // ALL RULES PASSED - VIABLE CASE
    result.classification_status = 'VIABLE_CASE';
    result.classification_reason = 'Case meets all criteria: positive surplus, individual owner, complete data';
    
    // Generate recommendations
    if (caseData.surplus_amount >= 50000) {
      result.recommendations.push('High-value case - prioritize');
    }
    if (!caseData.owner_email && !caseData.owner_phone) {
      result.recommendations.push('Run skip trace to find contact info');
    }
    if (caseData.stage === 'imported') {
      result.recommendations.push('Send agreement to homeowner');
    }

    // Update case with classification
    await base44.entities.Case.update(case_id, result);

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'case_classified',
      description: `Classified as ${result.classification_status}`,
      performed_by: user.email,
      metadata: result
    });

    return Response.json({
      status: 'success',
      classification: result
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

/**
 * Detect if owner name is a corporate entity
 */
function detectCorporateOwner(ownerName) {
  if (!ownerName) return { is_corporate: false, entity_type: null };
  
  const name = ownerName.toUpperCase();
  
  const corporateIndicators = [
    { pattern: /\bLLC\b|L\.L\.C\./i, type: 'LLC' },
    { pattern: /\bINC\b|INCORPORATED/i, type: 'Corporation' },
    { pattern: /\bCORP\b|CORPORATION/i, type: 'Corporation' },
    { pattern: /\bLP\b|L\.P\.|LLP|L\.L\.P\./i, type: 'Limited Partnership' },
    { pattern: /\bTRUST\b|TRUSTEE/i, type: 'Trust' },
    { pattern: /\bBANK\b|N\.A\.|NATIONAL ASSOCIATION/i, type: 'Bank' },
    { pattern: /\bCOMPANY\b|\bCO\.\b/i, type: 'Company' },
    { pattern: /\bPROPERTIES\b|INVESTMENTS|HOLDINGS/i, type: 'Investment Entity' },
    { pattern: /\bSERVICES\b/i, type: 'Services Company' },
    { pattern: /\bGROUP\b/i, type: 'Group' },
    { pattern: /\bENTERPRISES\b/i, type: 'Enterprise' },
  ];

  for (const indicator of corporateIndicators) {
    if (indicator.pattern.test(name)) {
      return { is_corporate: true, entity_type: indicator.type };
    }
  }

  return { is_corporate: false, entity_type: null };
}

/**
 * Detect if owner is deceased
 */
function detectDeceasedOwner(ownerName) {
  if (!ownerName) return false;
  
  const name = ownerName.toUpperCase();
  
  const deceasedIndicators = [
    /\bESTATE OF\b/i,
    /\bDECEASED\b/i,
    /\bDEC'D\b/i,
    /\bDECD\b/i,
    /\bHEIRS OF\b/i,
    /\bUNKNOWN HEIRS\b/i,
    /\bSURVIVING SPOUSE\b/i,
    /\bEXECUTOR\b/i,
    /\bADMINISTRATOR\b/i,
  ];

  return deceasedIndicators.some(pattern => pattern.test(name));
}

/**
 * Detect if plaintiff is a lender
 */
function detectLenderPlaintiff(notes) {
  if (!notes) return false;
  
  const lenderIndicators = [
    /\bBANK\b/i,
    /\bMORTGAGE\b/i,
    /\bLENDER\b/i,
    /\bCREDIT UNION\b/i,
    /\bWELLS FARGO\b/i,
    /\bBANK OF AMERICA\b/i,
    /\bCHASE\b/i,
    /\bCITI\b/i,
    /\bFANNIE MAE\b/i,
    /\bFREDDIE MAC\b/i,
    /\bFHA\b/i,
  ];

  return lenderIndicators.some(pattern => pattern.test(notes));
}