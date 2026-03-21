import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const result = calculateSurplus(payload);
    return Response.json({ status: 'success', ...result });
  } catch (error) {
    return Response.json({ status: 'error', error: error.message }, { status: 500 });
  }
});

function calculateSurplus(data) {
  const { winning_bid, opening_bid, provided_surplus, judgment_amount, costs } = data;

  if (provided_surplus && provided_surplus > 0) {
    return {
      surplus_amount: provided_surplus,
      calculation_method: 'provided',
      confidence: 'high',
      breakdown: { winning_bid, surplus: provided_surplus },
    };
  }

  if (winning_bid && judgment_amount) {
    const totalCosts = costs || 0;
    const calculated = winning_bid - judgment_amount - totalCosts;
    return {
      surplus_amount: Math.max(0, calculated),
      calculation_method: 'components',
      confidence: 'high',
      breakdown: { winning_bid, judgment_amount, costs: totalCosts, surplus: calculated },
    };
  }

  if (winning_bid && opening_bid) {
    const estimated = winning_bid - opening_bid;
    return {
      surplus_amount: Math.max(0, estimated),
      calculation_method: 'estimate',
      confidence: 'low',
      breakdown: { winning_bid, opening_bid, surplus: estimated },
      warning: 'Estimate only. Verify with county records.',
    };
  }

  return {
    surplus_amount: null,
    calculation_method: 'none',
    confidence: 'unknown',
    note: 'Not enough data. Enter surplus amount manually.',
  };
}