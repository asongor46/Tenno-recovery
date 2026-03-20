import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * ONE-TIME DATA MIGRATION
 * Copies fee_percentage → fee_percent for cases where fee_percent is missing
 * Admin only
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allCases = await base44.asServiceRole.entities.Case.list('-created_date', 1000);

    let migrated = 0;
    for (const c of allCases) {
      // If fee_percentage exists but fee_percent is missing/default
      if (c.fee_percentage && !c.fee_percent) {
        await base44.asServiceRole.entities.Case.update(c.id, {
          fee_percent: c.fee_percentage
        });
        migrated++;
      }
    }

    return Response.json({
      status: 'success',
      total_checked: allCases.length,
      migrated
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});