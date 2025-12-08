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
 * UPDATED: Distinguishes between missing data vs incomplete data
 */
async function checkIntegrity(caseData) {
  const issues = [];
  const warnings = [];

  // Critical: Must have basic identifying information
  if (!caseData.case_number && !caseData.parcel_number) {
    issues.push('CRITICAL: No case number or parcel number');
  }

  if (!caseData.property_address) {
    issues.push('Missing property address');
  }

  if (!caseData.county || !caseData.state) {
    issues.push('Missing county/state information');
  }

  // Important: Financial data
  if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
    warnings.push('Surplus amount not calculated yet');
  } else if (caseData.surplus_amount < 5000) {
    warnings.push('Surplus below $5,000 - may not be worth pursuing');
  }

  if (caseData.sale_amount && caseData.judgment_amount) {
    if (caseData.sale_amount <= caseData.judgment_amount) {
      issues.push('Sale amount does not exceed judgment - no surplus possible');
    }
  }

  // Timeline data
  if (!caseData.sale_date) {
    warnings.push('Missing sale date - cannot calculate claim deadline');
  }

  return {
    status: issues.length === 0 ? 'PASS' : 'FAIL',
    issues,
    warnings,
  };
}

/**
 * Stage 2: Owner Verification Check
 * UPDATED: Reflects real resolution statuses from resolveParcelOwner
 */
async function checkOwner(base44, caseData) {
  const issues = [];
  const warnings = [];
  
  // Check owner confidence level
  let confidence = caseData.owner_confidence || 'unknown';
  
  if (confidence === 'unknown') {
    issues.push('OWNER_NOT_RESOLVED: Run owner resolver to identify property owner');
  } else if (confidence === 'low') {
    warnings.push('Owner identity uncertain - manual verification recommended');
  }

  // Check for linked persons
  const links = await base44.entities.CasePersonLink.filter({ case_id: caseData.id });
  
  if (links.length === 0 && confidence !== 'unknown') {
    warnings.push('No Person record linked - consider running People Finder');
  }
  
  if (links.length > 1) {
    warnings.push('Multiple owners detected - verify primary owner');
  }

  // Check for contact information
  if (!caseData.owner_phone && !caseData.owner_email) {
    if (confidence === 'high' || confidence === 'medium') {
      warnings.push('Owner identified but no contact info - run People Finder');
    } else {
      issues.push('No contact information available');
    }
  }

  // Check for basic owner name
  if (!caseData.owner_name || caseData.owner_name.length < 3) {
    issues.push('No valid owner name recorded');
  }

  return {
    confidence,
    issues,
    warnings,
  };
}

/**
 * Stage 3: Surplus Verification Check
 * UPDATED: Reflects real calculation statuses from calculateSurplus
 */
async function checkSurplus(caseData) {
  const issues = [];
  const warnings = [];
  
  if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
    issues.push('SURPLUS_NOT_CALCULATED: Run surplus calculator');
    return {
      status: 'UNKNOWN',
      issues,
      warnings,
    };
  }
  
  // Surplus is known - validate it makes sense
  if (caseData.surplus_amount < 1000) {
    warnings.push('Surplus under $1,000 - may not cover costs');
  }
  
  if (caseData.sale_amount && caseData.surplus_amount > caseData.sale_amount) {
    issues.push('Surplus exceeds sale amount - data error');
  }
  
  return {
    status: caseData.surplus_amount > 0 ? 'AVAILABLE' : 'NONE',
    amount: caseData.surplus_amount,
    issues,
    warnings,
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
 * UPDATED: More nuanced status determination
 */
function determineOverallStatus({ integrity, owner, surplus, filing }) {
  // RED: Critical failures
  if (integrity.status === 'FAIL') return 'red';
  if (integrity.issues.some(i => i.includes('CRITICAL'))) return 'red';
  
  // RED: Owner completely unknown
  if (owner.confidence === 'unknown') return 'red';
  
  // YELLOW: Data incomplete but recoverable
  if (surplus.status === 'UNKNOWN') return 'yellow';
  if (owner.confidence === 'low') return 'yellow';
  if (filing.mode === 'unknown' || filing.mode === 'homeowner_files') return 'yellow';
  
  // YELLOW: Has warnings
  if ((integrity.warnings?.length || 0) > 0) return 'yellow';
  if ((owner.warnings?.length || 0) > 0) return 'yellow';
  if ((surplus.warnings?.length || 0) > 0) return 'yellow';
  
  // GREEN: All critical checks passed
  if (owner.confidence === 'high' && integrity.status === 'PASS' && surplus.status === 'AVAILABLE') {
    return 'green';
  }
  
  return 'yellow';
}

/**
 * Generate human-readable summary
 * UPDATED: Provides specific actionable guidance
 */
function generateSummary(status, integrity, owner, surplus) {
  if (status === 'green') {
    return `Case verified ✓ - Surplus: $${surplus.amount?.toLocaleString() || 'N/A'}, Owner: ${owner.confidence}`;
  }
  
  // Collect all issues and warnings
  const allIssues = [
    ...(integrity.issues || []),
    ...(owner.issues || []),
    ...(surplus.issues || []),
  ];
  
  const allWarnings = [
    ...(integrity.warnings || []),
    ...(owner.warnings || []),
    ...(surplus.warnings || []),
  ];

  if (status === 'red') {
    const criticalIssues = allIssues.filter(i => 
      i.includes('CRITICAL') || 
      i.includes('OWNER_NOT_RESOLVED') || 
      i.includes('SURPLUS_NOT_CALCULATED')
    );
    
    if (criticalIssues.length > 0) {
      return `Action required: ${criticalIssues[0]}`;
    }
    
    return `Critical issues: ${allIssues.slice(0, 2).join('; ')}`;
  }
  
  if (status === 'yellow') {
    if (allIssues.length > 0) {
      return `Needs attention: ${allIssues[0]}`;
    }
    if (allWarnings.length > 0) {
      return `Review: ${allWarnings[0]}`;
    }
  }

  return 'Review recommended before proceeding';
}