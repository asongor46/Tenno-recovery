import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DATA CLEANUP SERVICE - Step 9
 * Comprehensive maintenance operations
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();

    let result;
    
    switch (action) {
      case 'detect_duplicates':
        result = await detectDuplicates(base44);
        break;
      case 'archive_stale':
        result = await archiveStaleCases(base44);
        break;
      case 'clean_orphans':
        result = await cleanOrphanedData(base44);
        break;
      case 'validate_integrity':
        result = await validateDataIntegrity(base44);
        break;
      case 'fix_missing_counties':
        result = await fixMissingCounties(base44);
        break;
      case 'normalize_phones':
        result = await normalizePhoneNumbers(base44);
        break;
      case 'run_full_cleanup':
        result = await runFullCleanup(base44);
        break;
      default:
        return Response.json({ 
          status: 'error',
          details: 'Invalid action' 
        }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      result
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

async function detectDuplicates(base44) {
  const cases = await base44.entities.Case.list('-created_date', 1000);
  
  const duplicateGroups = {};
  
  for (const c of cases) {
    const key = `${c.owner_name?.toLowerCase()}_${c.parcel_number}`;
    if (!duplicateGroups[key]) {
      duplicateGroups[key] = [];
    }
    duplicateGroups[key].push(c);
  }
  
  const duplicates = Object.entries(duplicateGroups)
    .filter(([_, group]) => group.length > 1)
    .map(([key, group]) => ({
      owner_name: group[0].owner_name,
      parcel_number: group[0].parcel_number,
      count: group.length,
      case_ids: group.map(c => c.id)
    }));
  
  return {
    count: duplicates.length,
    examples: duplicates.slice(0, 10)
  };
}

async function archiveStaleCases(base44) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const cases = await base44.entities.Case.list('-updated_date', 1000);
  
  const staleCases = cases.filter(c => 
    c.status === 'active' && 
    new Date(c.updated_date) < sixMonthsAgo
  );
  
  let archived = 0;
  
  for (const c of staleCases) {
    await base44.entities.Case.update(c.id, {
      status: 'archived',
      internal_notes: (c.internal_notes || '') + '\n\nAuto-archived: No activity for 6+ months'
    });
    archived++;
  }
  
  return {
    archived,
    total_checked: cases.length
  };
}

async function cleanOrphanedData(base44) {
  const cases = await base44.entities.Case.list('-created_date', 1000);
  const caseIds = new Set(cases.map(c => c.id));
  
  let cleaned = { documents: 0, steps: 0, logs: 0, events: 0 };
  
  // Clean orphaned documents
  const documents = await base44.entities.Document.list('-created_date', 1000);
  for (const doc of documents) {
    if (doc.case_id && !caseIds.has(doc.case_id)) {
      await base44.entities.Document.delete(doc.id);
      cleaned.documents++;
    }
  }
  
  // Clean orphaned steps
  const steps = await base44.entities.HomeownerStep.list('-created_date', 1000);
  for (const step of steps) {
    if (step.case_id && !caseIds.has(step.case_id)) {
      await base44.entities.HomeownerStep.delete(step.id);
      cleaned.steps++;
    }
  }
  
  // Clean orphaned logs
  const logs = await base44.entities.ActivityLog.list('-created_date', 1000);
  for (const log of logs) {
    if (log.case_id && !caseIds.has(log.case_id)) {
      await base44.entities.ActivityLog.delete(log.id);
      cleaned.logs++;
    }
  }
  
  // Clean orphaned events
  const events = await base44.entities.HomeownerTaskEvent.list('-created_date', 1000);
  for (const event of events) {
    if (event.case_id && !caseIds.has(event.case_id)) {
      await base44.entities.HomeownerTaskEvent.delete(event.id);
      cleaned.events++;
    }
  }
  
  return {
    ...cleaned,
    total_cleaned: cleaned.documents + cleaned.steps + cleaned.logs + cleaned.events
  };
}

async function validateDataIntegrity(base44) {
  const cases = await base44.entities.Case.list('-created_date', 1000);
  const issues = [];
  
  for (const c of cases) {
    if (!c.case_number) {
      issues.push(`Case ${c.id}: Missing case number`);
    }
    if (!c.owner_name) {
      issues.push(`Case ${c.id}: Missing owner name`);
    }
    if (!c.county) {
      issues.push(`Case ${c.id}: Missing county`);
    }
    if (c.surplus_amount && c.surplus_amount < 0) {
      issues.push(`Case ${c.id}: Invalid surplus amount (${c.surplus_amount})`);
    }
    if (c.agreement_status === 'signed' && !c.agreement_signed_at) {
      issues.push(`Case ${c.id}: Agreement signed but no timestamp`);
    }
    if (c.stage === 'paid' && !c.paid_at) {
      issues.push(`Case ${c.id}: Stage is paid but no paid_at timestamp`);
    }
  }
  
  return {
    issues,
    total_cases_checked: cases.length
  };
}

async function fixMissingCounties(base44) {
  const cases = await base44.entities.Case.filter({ county: null });
  
  let fixed = 0;
  
  for (const c of cases) {
    if (c.property_address) {
      const addressParts = c.property_address.split(',');
      if (addressParts.length >= 2) {
        const potentialCounty = addressParts[addressParts.length - 2].trim();
        await base44.entities.Case.update(c.id, {
          county: potentialCounty,
          internal_notes: (c.internal_notes || '') + '\n\nCounty auto-populated from address'
        });
        fixed++;
      }
    }
  }
  
  return {
    fixed,
    total_checked: cases.length
  };
}

async function normalizePhoneNumbers(base44) {
  const cases = await base44.entities.Case.list('-created_date', 1000);
  
  let normalized = 0;
  
  for (const c of cases) {
    if (c.owner_phone) {
      const cleaned = c.owner_phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        const formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        await base44.entities.Case.update(c.id, {
          owner_phone: formatted
        });
        normalized++;
      }
    }
  }
  
  return {
    normalized,
    total_checked: cases.length
  };
}

async function runFullCleanup(base44) {
  const results = {};
  
  // 1. Detect duplicates
  const duplicates = await detectDuplicates(base44);
  results.duplicates_found = duplicates.count;
  
  // 2. Clean orphans
  const orphans = await cleanOrphanedData(base44);
  results.orphans_cleaned = orphans.total_cleaned;
  
  // 3. Validate integrity
  const validation = await validateDataIntegrity(base44);
  results.validation_issues = validation.issues.length;
  
  // 4. Fix counties
  const counties = await fixMissingCounties(base44);
  results.counties_fixed = counties.fixed;
  
  // 5. Normalize phones
  const phones = await normalizePhoneNumbers(base44);
  results.phones_normalized = phones.normalized;
  
  return results;
}