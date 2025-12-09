import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AI-Powered Skip Trace Automation
 * Automatically extracts, categorizes, scores, and classifies owner information
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, owner_name, property_address, county, state, parcel_number } = await req.json();

    if (!owner_name) {
      return Response.json({ 
        status: 'error',
        details: 'owner_name required' 
      }, { status: 400 });
    }

    // Step 1: Create query record
    const query = await base44.entities.PeopleFinderQuery.create({
      case_id: case_id || null,
      input_name: owner_name,
      input_address: property_address,
      input_county: county,
      run_type: "internal_plus_ai_analysis",
      status: "running",
    });

    // Step 2: Search internal database first
    const nameParts = owner_name.toLowerCase().split(' ');
    const possibleMatches = await base44.asServiceRole.entities.Person.filter({});
    
    const internalCandidates = possibleMatches.filter(person => {
      const personName = person.full_name?.toLowerCase() || '';
      return nameParts.some(part => personName.includes(part));
    }).slice(0, 5);

    // Step 3: Gather all contact data for each candidate
    const candidatesWithContacts = [];
    
    for (const person of internalCandidates) {
      const contacts = await base44.asServiceRole.entities.ContactPoint.filter({ person_id: person.id });
      const addresses = await base44.asServiceRole.entities.Address.filter({ person_id: person.id });
      
      candidatesWithContacts.push({
        person,
        phones: contacts.filter(c => c.type === 'phone').map(c => c.value),
        emails: contacts.filter(c => c.type === 'email').map(c => c.value),
        addresses: addresses.map(a => `${a.line1}, ${a.city}, ${a.state} ${a.zip}`),
        raw_contacts: contacts,
        raw_addresses: addresses,
      });
    }

    // Step 4: Use AI to analyze and score each candidate
    const aiAnalysisPrompt = `You are a skip-trace specialist analyzing potential matches for a property owner.

**Target Owner:**
- Name: ${owner_name}
- Property Address: ${property_address || 'Unknown'}
- County: ${county || 'Unknown'}, ${state || 'Unknown'}
- Parcel: ${parcel_number || 'Unknown'}

**Candidates Found in Database:**
${candidatesWithContacts.map((c, idx) => `
Candidate ${idx + 1}:
- Name: ${c.person.full_name}
- Phones: ${c.phones.join(', ') || 'None'}
- Emails: ${c.emails.join(', ') || 'None'}
- Addresses: ${c.addresses.join(' | ') || 'None'}
`).join('\n')}

**Your Task:**
For each candidate, analyze and return:
1. Match score (0-100) based on name similarity, address proximity, data completeness
2. Confidence level: "high", "medium", or "low"
3. Lead classification: "A+", "A", "B", "C", or "D" based on:
   - A+: Perfect match, 3+ phones, email, current address
   - A: Strong match, 1-2 phones, likely valid
   - B: Medium match, address found, phones questionable
   - C: Weak match, partial data
   - D: Insufficient data
4. Contact categorization: Label each phone as "mobile_primary", "mobile_secondary", "landline", or "unknown"
5. Summary notes: 2-3 sentence assessment of this candidate
6. Reason codes: Array of match reasons like "NAME_EXACT_MATCH", "ADDRESS_SAME_COUNTY", "PHONE_VERIFIED", etc.
7. Red flags: Any concerns (e.g., "deceased_indicator", "wrong_state", "no_contact_info")

Return structured data for all candidates.`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: aiAnalysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          candidates_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                candidate_index: { type: "number" },
                match_score: { type: "number" },
                confidence_level: { type: "string", enum: ["high", "medium", "low"] },
                classification: { type: "string", enum: ["A+", "A", "B", "C", "D"] },
                summary_notes: { type: "string" },
                reason_codes: { type: "array", items: { type: "string" } },
                red_flags: { type: "array", items: { type: "string" } },
                phone_labels: {
                  type: "object",
                  description: "Map of phone number to label (mobile_primary, mobile_secondary, landline)"
                },
                recommended_action: { 
                  type: "string", 
                  enum: ["use", "caution", "ignore"],
                  description: "Recommended action based on analysis"
                }
              }
            }
          },
          overall_assessment: { 
            type: "string",
            description: "Overall assessment of the skip trace results"
          }
        }
      }
    });

    // Step 5: Create MatchCandidate records with AI enrichment
    const createdCandidates = [];
    
    for (let i = 0; i < candidatesWithContacts.length; i++) {
      const c = candidatesWithContacts[i];
      const analysis = aiResult.candidates_analysis.find(a => a.candidate_index === i) || {
        match_score: 50,
        confidence_level: "medium",
        classification: "C",
        summary_notes: "Limited data available for analysis",
        reason_codes: ["FOUND_IN_DATABASE"],
        red_flags: [],
        phone_labels: {},
        recommended_action: "caution"
      };

      const candidate = await base44.asServiceRole.entities.MatchCandidate.create({
        query_id: query.id,
        person_id: c.person.id,
        raw_source_data: {
          first_name: c.person.first_name,
          last_name: c.person.last_name,
          full_name: c.person.full_name,
          ai_classification: analysis.classification,
          ai_summary: analysis.summary_notes,
          phone_labels: analysis.phone_labels,
          red_flags: analysis.red_flags,
        },
        match_score: analysis.match_score,
        confidence_level: analysis.confidence_level,
        reason_codes: analysis.reason_codes,
        recommended_action: analysis.recommended_action,
        candidate_name: c.person.full_name,
        candidate_phones: c.phones,
        candidate_emails: c.emails,
        candidate_addresses: c.addresses,
      });

      createdCandidates.push(candidate);
    }

    // Step 6: Update query with completion status
    await base44.asServiceRole.entities.PeopleFinderQuery.update(query.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      candidates_found: createdCandidates.length,
      result_summary: aiResult.overall_assessment,
    });

    // Step 7: If case_id provided, update case with best candidate data
    if (case_id && createdCandidates.length > 0) {
      const bestCandidate = createdCandidates.sort((a, b) => b.match_score - a.match_score)[0];
      
      const updateData = {
        owner_confidence: bestCandidate.confidence_level,
      };
      
      if (bestCandidate.candidate_phones?.[0]) {
        updateData.owner_phone = bestCandidate.candidate_phones[0];
      }
      if (bestCandidate.candidate_emails?.[0]) {
        updateData.owner_email = bestCandidate.candidate_emails[0];
      }
      if (bestCandidate.candidate_addresses?.[0]) {
        updateData.owner_address = bestCandidate.candidate_addresses[0];
      }

      await base44.asServiceRole.entities.Case.update(case_id, updateData);

      // Log activity
      await base44.asServiceRole.entities.ActivityLog.create({
        case_id,
        action: "ai_skip_trace_completed",
        description: `AI Skip Trace: Found ${createdCandidates.length} candidates. Best match: ${bestCandidate.candidate_name} (${bestCandidate.match_score}/100, ${bestCandidate.raw_source_data?.ai_classification || 'N/A'})`,
        performed_by: user.email,
        metadata: {
          query_id: query.id,
          best_candidate_id: bestCandidate.id,
          classification: bestCandidate.raw_source_data?.ai_classification,
        }
      });
    }

    return Response.json({
      status: 'success',
      query_id: query.id,
      candidates_found: createdCandidates.length,
      overall_assessment: aiResult.overall_assessment,
      best_match: createdCandidates.length > 0 ? {
        name: createdCandidates[0].candidate_name,
        score: createdCandidates[0].match_score,
        classification: createdCandidates[0].raw_source_data?.ai_classification,
        summary: createdCandidates[0].raw_source_data?.ai_summary,
      } : null,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});