import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SMART FEE RECOMMENDATION ENGINE
 * Analyzes case complexity and recommends optimal fee: 15%, 20%, 25%, or 30%
 * Solo operator optimized - balances competitiveness vs. manual effort
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

    // Fetch county profile for difficulty assessment
    let countyDifficulty = 'medium';
    if (caseData.county && caseData.state) {
      const counties = await base44.entities.County.filter({ 
        name: caseData.county,
        state: caseData.state 
      });
      if (counties[0]) {
        const county = counties[0];
        // Assess county difficulty
        if (!county.allows_filing_on_behalf || county.requires_notarized_authorization) {
          countyDifficulty = 'high';
        } else if (county.filing_method === 'efile') {
          countyDifficulty = 'low';
        }
      }
    }

    // Calculate complexity factors
    const surplus = caseData.surplus_amount || 0;
    const complexity = caseData.case_complexity || 'medium';

    // Fee recommendation logic
    let recommendedFee = 20; // Default
    let reasoning = [];

    // Base decision on surplus amount
    if (surplus < 5000) {
      recommendedFee = 30;
      reasoning.push('Low surplus amount (<$5k) - higher fee to justify effort');
    } else if (surplus < 15000) {
      recommendedFee = 25;
      reasoning.push('Moderate surplus amount (<$15k) - 25% fee');
    } else if (surplus >= 50000) {
      recommendedFee = 15;
      reasoning.push('High surplus amount (≥$50k) - competitive 15% fee');
    } else {
      recommendedFee = 20;
      reasoning.push('Standard surplus amount - 20% baseline');
    }

    // Adjust for complexity
    if (complexity === 'high') {
      recommendedFee = Math.min(30, recommendedFee + 5);
      reasoning.push('High case complexity - increased fee');
    } else if (complexity === 'low' && recommendedFee > 15) {
      recommendedFee = Math.max(15, recommendedFee - 5);
      reasoning.push('Low case complexity - reduced fee');
    }

    // Adjust for county difficulty
    if (countyDifficulty === 'high' && recommendedFee < 25) {
      recommendedFee = Math.min(30, recommendedFee + 5);
      reasoning.push('Difficult county requirements - increased fee');
    }

    // Ensure fee is in valid range
    const validFees = [15, 20, 25, 30];
    recommendedFee = validFees.reduce((prev, curr) => 
      Math.abs(curr - recommendedFee) < Math.abs(prev - recommendedFee) ? curr : prev
    );

    // Calculate projected revenue
    const projectedRevenue = surplus * (recommendedFee / 100);

    // Update case with recommendation (don't lock fee yet)
    await base44.entities.Case.update(case_id, {
      recommended_fee_percent: recommendedFee,
      case_complexity: complexity,
    });

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'fee_recommended',
      description: `Fee recommendation: ${recommendedFee}% (${reasoning.join('; ')})`,
      performed_by: user.email,
      metadata: { 
        recommended_fee: recommendedFee,
        surplus,
        complexity,
        county_difficulty: countyDifficulty,
        projected_revenue: projectedRevenue
      }
    });

    return Response.json({
      status: 'success',
      recommended_fee_percent: recommendedFee,
      projected_revenue: Math.round(projectedRevenue),
      reasoning,
      case_complexity: complexity,
      county_difficulty: countyDifficulty,
      can_override: true,
      locked: false,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});