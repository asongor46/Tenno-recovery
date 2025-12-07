import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Case Verification Engine
 * Validates case integrity, owner verification, surplus status, and filing permissions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

    // Load case data
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];

    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Load county rules
    let county = null;
    if (caseData.county && caseData.state) {
      const counties = await base44.entities.County.filter({
        name: caseData.county,
        state: caseData.state,
      });
      county = counties[0];
    }

    // Run all verification stages
    const integrity = await checkIntegrity(caseData);
    const owner = await checkOwner(base44, caseData);
    const surplus = await checkSurplus(caseData);
    const filing = await checkFiling(caseData, county);
    const notaryReq = await checkNotary(caseData, county);

    // Calculate complexity score
    const complexity = calculateComplexity({
      caseData,
      county,
      ownerCheck: owner,
      filingCheck: filing,
    });

    // Determine overall status
    const overallStatus = determineOverallStatus({
      integrity,
      owner,
      surplus,
      filing,
    });

    // Generate summary
    const summary = generateSummary(overallStatus, integrity, owner, surplus);

    // Update case
    await base44.asServiceRole.entities.Case.update(case_id, {
      verification_status: overallStatus,
      verification_summary: summary,
      complexity_score: complexity.score,
      owner_confidence: owner.confidence,
      verification_details: {
        integrity_status: integrity.status,
        owner_confidence: owner.confidence,
        surplus_status: surplus.status,
        filing_mode: filing.mode,
        notary_requirement: notaryReq.requirement,
        complexity_label: complexity.label,
        last_verified_at: new Date().toISOString(),
      },
    });

    // Create alerts if needed
    if (overallStatus === 'red') {
      await base44.asServiceRole.entities.Alert.create({
        case_id,
        type: 'action_required',
        title: 'Case Verification Issues',
        message: summary,
        severity: 'error',
      });
    }

    return Response.json({
      status: 'success',
      verification: {
        overall_status: overallStatus,
        summary,
        complexity,
        checks: { integrity, owner, surplus, filing, notary: notaryReq },
      },
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Stage 1: Case Integrity Check
 */
async function checkIntegrity(caseData) {
  const issues = [];

  if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
    issues.push('No surplus amount');
  }

  if (caseData.sale_amount && caseData.judgment_amount) {
    if (caseData.sale_amount <= caseData.judgment_amount) {
      issues.push('Sale amount does not exceed judgment');
    }
  }

  if (!caseData.sale_date) {
    issues.push('Missing sale date');
  }

  if (!caseData.property_address) {
    issues.push('Missing property address');
  }

  return {
    status: issues.length === 0 ? 'PASS' : 'FAIL',
    issues,
  };
}

/**
 * Stage 2: Owner Verification Check
 */
async function checkOwner(base44, caseData) {
  // Check if we have linked persons
  const links = await base44.entities.CasePersonLink.filter({ case_id: caseData.id });
  
  let confidence = caseData.owner_confidence || 'unknown';
  const issues = [];

  if (links.length === 0) {
    issues.push('No verified person linked');
    confidence = 'low';
  } else {
    const primaryOwner = links.find(l => l.role === 'primary_owner');
    if (primaryOwner) {
      confidence = primaryOwner.confidence;
    }
  }

  if (!caseData.owner_phone && !caseData.owner_email) {
    issues.push('No contact information');
  }

  if (links.length > 1) {
    issues.push('Multiple owners detected');
  }

  return {
    confidence,
    issues,
  };
}

/**
 * Stage 3: Surplus Verification Check
 */
async function checkSurplus(caseData) {
  // Simple check for now - would integrate with county lookups in production
  return {
    status: caseData.surplus_amount > 0 ? 'AVAILABLE' : 'UNKNOWN',
    issues: [],
  };
}

/**
 * Stage 4: Filing Permissions Check
 */
async function checkFiling(caseData, county) {
  if (!county) {
    return {
      mode: 'unknown',
      issues: ['County rules not loaded'],
    };
  }

  let mode = 'we_file';
  const issues = [];

  if (!county.rep_allowed) {
    mode = 'homeowner_files';
    issues.push('Representatives not allowed');
  }

  if (county.assignment_required) {
    mode = 'assignment_based';
    issues.push('Assignment required');
  }

  return { mode, issues };
}

/**
 * Stage 5: Notary Check
 */
async function checkNotary(caseData, county) {
  if (!county || !county.notary_required) {
    return {
      requirement: 'none',
      issues: [],
    };
  }

  let requirement = county.notary_type || 'either';
  const issues = [];

  if (caseData.notary_status === 'pending') {
    issues.push('Notary pending');
  }

  return { requirement, issues };
}

/**
 * Calculate complexity score
 */
function calculateComplexity({ caseData, county, ownerCheck, filingCheck }) {
  let score = 0;

  // Simple case = low score
  // Complex case = high score

  // Owner complexity
  if (ownerCheck.confidence === 'low') score += 30;
  else if (ownerCheck.confidence === 'medium') score += 15;

  if (ownerCheck.issues.includes('Multiple owners detected')) score += 20;
  if (ownerCheck.issues.includes('No contact information')) score += 15;

  // Filing complexity
  if (filingCheck.mode === 'homeowner_files') score += 25;
  if (filingCheck.mode === 'assignment_based') score += 20;

  // County strictness
  if (county?.filing_method === 'in_person') score += 15;
  if (county?.notary_type === 'wet') score += 10;

  // Amount (higher = more effort worthwhile, so lower complexity concern)
  if (caseData.surplus_amount < 10000) score += 20;

  const label = score <= 30 ? 'green' : score <= 60 ? 'yellow' : 'red';

  return { score: Math.min(score, 100), label };
}

/**
 * Determine overall verification status
 */
function determineOverallStatus({ integrity, owner, surplus, filing }) {
  if (integrity.status === 'FAIL') return 'red';
  if (owner.confidence === 'low') return 'yellow';
  if (surplus.status === 'UNKNOWN') return 'yellow';
  if (filing.mode === 'unknown') return 'yellow';
  if (owner.confidence === 'high' && integrity.status === 'PASS') return 'green';
  
  return 'yellow';
}

/**
 * Generate human-readable summary
 */
function generateSummary(status, integrity, owner, surplus) {
  if (status === 'green') {
    return 'Case verified - ready to proceed';
  }
  
  const issues = [
    ...integrity.issues,
    ...owner.issues,
    ...surplus.issues,
  ];

  if (issues.length > 0) {
    return `Issues found: ${issues.slice(0, 2).join(', ')}`;
  }

  return 'Review recommended before proceeding';
}