import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PHASE 1 - FUNCTION 2: Case Owner Identity Resolution
 * Consolidates all name sources for a case, creates/links Person entity
 * Uses normalizeOwnerName to parse structured components
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
        error: 'Missing case_id parameter' 
      }, { status: 400 });
    }

    // Load case data
    const cases = await base44.asServiceRole.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        error: 'Case not found' 
      }, { status: 404 });
    }

    // Step 1: Collect all candidate names
    const candidateNames = [];
    
    // From case owner_name
    if (caseData.owner_name) {
      candidateNames.push({
        raw_name: caseData.owner_name,
        source: 'case_owner_name',
        confidence: 'medium',
      });
    }

    // From verification details (if appraiser data exists)
    if (caseData.verification_details?.owner_data?.ownerName) {
      candidateNames.push({
        raw_name: caseData.verification_details.owner_data.ownerName,
        source: 'appraiser_lookup',
        confidence: 'high',
      });
    }

    // From uploaded documents (future enhancement)
    // TODO: Query Document entities with usable_for_identity=true

    // Step 2: Parse each candidate name
    const parsedCandidates = [];
    
    for (const candidate of candidateNames) {
      // Call normalizeOwnerName function
      const { data: parseResult } = await base44.asServiceRole.functions.invoke('normalizeOwnerName', {
        raw_name: candidate.raw_name,
      });
      
      if (parseResult.status === 'success') {
        parsedCandidates.push({
          ...parseResult.parsed,
          source: candidate.source,
          source_confidence: candidate.confidence,
        });
      }
    }

    if (parsedCandidates.length === 0) {
      return Response.json({
        status: 'no_data',
        message: 'No owner name data available to resolve',
      });
    }

    // Step 3: Select primary candidate (highest confidence)
    const primaryCandidate = parsedCandidates.sort((a, b) => {
      const confOrder = { high: 3, medium: 2, low: 1 };
      return confOrder[b.source_confidence] - confOrder[a.source_confidence];
    })[0];

    // Step 4: Check if Person already exists
    let person = null;
    const existingPersons = await base44.asServiceRole.entities.Person.filter({
      first_name: primaryCandidate.first_name,
      last_name: primaryCandidate.last_name,
    });

    if (existingPersons.length > 0) {
      // Found existing person - use it
      person = existingPersons[0];
    } else {
      // Create new Person entity
      person = await base44.asServiceRole.entities.Person.create({
        full_name: primaryCandidate.full_name,
        first_name: primaryCandidate.first_name,
        middle_name: primaryCandidate.middle_name,
        last_name: primaryCandidate.last_name,
        suffix: primaryCandidate.suffix,
        aliases: parsedCandidates
          .filter(c => c.full_name !== primaryCandidate.full_name)
          .map(c => c.full_name),
      });
    }

    // Step 5: Create or update CasePersonLink
    const existingLinks = await base44.asServiceRole.entities.CasePersonLink.filter({
      case_id: case_id,
      person_id: person.id,
    });

    if (existingLinks.length === 0) {
      await base44.asServiceRole.entities.CasePersonLink.create({
        case_id: case_id,
        person_id: person.id,
        role: 'primary_owner',
        confidence: primaryCandidate.source_confidence,
        source_type: 'identity_resolver',
      });
    }

    // Step 6: Update case with normalized identity
    await base44.asServiceRole.entities.Case.update(case_id, {
      owner_name: primaryCandidate.full_name,
      owner_confidence: primaryCandidate.source_confidence,
    });

    return Response.json({
      status: 'success',
      person_id: person.id,
      person,
      candidates_processed: parsedCandidates.length,
      primary_source: primaryCandidate.source,
      parsing_confidence: primaryCandidate.parsing_confidence,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});