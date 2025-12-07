import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request payload
    const { query_id, name, address, county, state, mode } = await req.json();

    // REMOVED MOCK DATA - Now searches only internal sources
    // Internal sources:
    // 1. Property appraiser data (via scraper)
    // 2. Uploaded PDFs (deed, notice, etc.)
    // 3. Manual intake form data
    
    const candidates = [];
    
    // Source 1: Try property appraiser if we have address or parcel
    if (county && state && mode === 'internal_plus_scrape') {
      // Call appraiser scraper to get owner info
      const normalizedCounty = county.toLowerCase().replace(/\s+/g, '_');
      const normalizedState = state.toLowerCase();
      const countyId = `${normalizedCounty}_${normalizedState}`;
      
      // TODO: Extract parcel from address or use existing parcel data
      // For now, we skip appraiser scraping if no parcel provided
    }
    
    // Source 2: Check existing Person records that match name/address
    const existingPersons = await base44.asServiceRole.entities.Person.filter({});
    
    for (const person of existingPersons) {
      const nameMatch = person.full_name?.toLowerCase().includes(name?.toLowerCase()) ||
                       name?.toLowerCase().includes(person.full_name?.toLowerCase());
      
      if (nameMatch) {
        // Get contact points for this person
        const contacts = await base44.asServiceRole.entities.ContactPoint.filter({
          person_id: person.id,
        });
        
        const addresses = await base44.asServiceRole.entities.Address.filter({
          person_id: person.id,
        });
        
        candidates.push({
          candidate_name: person.full_name,
          candidate_phones: contacts.filter(c => c.type === 'phone').map(c => c.value),
          candidate_emails: contacts.filter(c => c.type === 'email').map(c => c.value),
          candidate_addresses: addresses.map(a => `${a.line1}, ${a.city}, ${a.state} ${a.zip}`),
          match_score: 75,
          confidence_level: "medium",
          reason_codes: ["INTERNAL_MATCH"],
          recommended_action: "caution",
          raw_source_data: {
            person_id: person.id,
            source: 'internal_database',
          },
        });
      }
    }
    
    // If no internal matches found, return empty with note
    if (candidates.length === 0) {
      return Response.json({
        status: "success",
        summary: "No candidates found in internal sources",
        candidates: [],
        note: "Consider running appraiser lookup or uploading PDFs with owner information",
      });
    }

    // Store candidates in database
    for (const candidate of candidates) {
      await base44.asServiceRole.entities.MatchCandidate.create({
        query_id,
        ...candidate,
      });
    }

    return Response.json({
      status: "success",
      summary: `Found ${candidates.length} candidate(s) from internal sources`,
      candidates,
    });

  } catch (error) {
    return Response.json({ 
      status: "error",
      error: error.message 
    }, { status: 500 });
  }
});