import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SMART FEE ENGINE
 * Calculates recommended fee percentage based on case complexity
 * Rules: 15%, 20%, 25%, or 30%
 * 
 * Inputs:
 * - estimated_surplus
 * - case_complexity (low/medium/high)
 * - county difficulty (derived from county data)
 * - manual filing required
 * 
 * Outputs:
 * - recommended_fee_percent ∈ {15, 20, 25, 30}
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

    // Fetch county data
    let countyDifficulty = 'medium';
    if (caseData.county && caseData.state) {
      const counties = await base44.entities.County.filter({ 
        name: caseData.county,
        state: caseData.state 
      });
      const county = counties[0];
      
      if (county) {
        // Determine county difficulty
        if (county.requires_notarized_authorization || !county.allows_filing_on_behalf) {
          countyDifficulty = 'high';
        } else if (county.filing_method === 'efile' && county.allows_filing_on_behalf) {
          countyDifficulty = 'low';
        }
      }
    }

    // Calculate recommended fee
    const surplus = caseData.estimated_surplus || caseData.surplus_amount || 0;
    const complexity = caseData.case_complexity || 'medium';
    
    let recommendedFee = 20; // Default

    // FEE LOGIC
    // 15% - Simple cases, high surplus, easy counties
    // 20% - Standard cases
    // 25% - Complex cases or difficult counties
    // 30% - High complexity + difficult county + low surplus

    if (surplus >= 50000 && complexity === 'low' && countyDifficulty === 'low') {
      recommendedFee = 15;
    } else if (surplus >= 30000 && complexity === 'low') {
      recommendedFee = 15;
    } else if (complexity === 'high' && countyDifficulty === 'high') {
      recommendedFee = 30;
    } else if (complexity === 'high' || countyDifficulty === 'high') {
      recommendedFee = 25;
    } else if (surplus < 10000 && complexity === 'medium') {
      recommendedFee = 25;
    } else {
      recommendedFee = 20; // Standard
    }

    // Update case with recommendation
    await base44.entities.Case.update(case_id, {
      recommended_fee_percent: recommendedFee,
      fee_percent: recommendedFee, // Set initial fee (agent can override before agreement)
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'fee_calculated',
      description: `Smart fee engine recommended ${recommendedFee}%`,
      performed_by: 'system',
      metadata: {
        surplus,
        complexity,
        countyDifficulty,
        recommendedFee
      }
    });

    return Response.json({
      status: 'success',
      recommended_fee_percent: recommendedFee,
      factors: {
        surplus,
        complexity,
        countyDifficulty
      },
      reasoning: getReasoningText(recommendedFee, surplus, complexity, countyDifficulty)
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function getReasoningText(fee, surplus, complexity, countyDifficulty) {
  const reasons = [];
  
  if (fee === 15) {
    reasons.push('High surplus amount');
    reasons.push('Low complexity case');
    reasons.push('Easy filing county');
  } else if (fee === 30) {
    reasons.push('High complexity case');
    reasons.push('Difficult county requirements');
    if (surplus < 10000) reasons.push('Lower surplus amount');
  } else if (fee === 25) {
    if (complexity === 'high') reasons.push('High complexity case');
    if (countyDifficulty === 'high') reasons.push('Difficult county requirements');
    if (surplus < 10000) reasons.push('Lower surplus amount');
  } else {
    reasons.push('Standard case parameters');
  }
  
  return reasons.join('; ');
}