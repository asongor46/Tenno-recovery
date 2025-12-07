import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * People Finder Function
 * Searches for person identity using internal data, PDF extractions, and optionally public sources
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query_id, name, address, county, state, mode } = await req.json();

    // Phase 1: Internal Search - Check existing Person records
    const internalCandidates = await searchInternalRecords(base44, name, address, county);

    // Phase 2: PDF-Based Search - Check extracted data from documents
    const pdfCandidates = await searchPDFData(base44, name, address, county);

    // Phase 3: Public Search (if requested)
    let publicCandidates = [];
    if (mode === "internal_plus_scrape") {
      publicCandidates = await searchPublicData(name, address, state);
    }

    // Merge and score all candidates
    const allCandidates = mergeCandidates(internalCandidates, pdfCandidates, publicCandidates);
    const scoredCandidates = scoreCandidates(allCandidates, name, address);

    // Save candidates to database
    for (const candidate of scoredCandidates) {
      await base44.asServiceRole.entities.MatchCandidate.create({
        query_id,
        candidate_name: candidate.name,
        candidate_phones: candidate.phones,
        candidate_emails: candidate.emails,
        candidate_addresses: candidate.addresses,
        match_score: candidate.score,
        confidence_level: candidate.confidence,
        reason_codes: candidate.reasons,
        recommended_action: candidate.action,
        raw_source_data: candidate.raw,
      });
    }

    return Response.json({
      status: 'success',
      candidates: scoredCandidates,
      summary: `Found ${scoredCandidates.length} candidates (${scoredCandidates.filter(c => c.confidence === 'high').length} high confidence)`,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Search internal Person records
 */
async function searchInternalRecords(base44, name, address, county) {
  const persons = await base44.asServiceRole.entities.Person.list();
  const candidates = [];

  for (const person of persons) {
    const nameMatch = calculateNameSimilarity(person.full_name, name);
    if (nameMatch > 0.5) {
      // Get contacts and addresses for this person
      const contacts = await base44.asServiceRole.entities.ContactPoint.filter({ person_id: person.id });
      const addresses = await base44.asServiceRole.entities.Address.filter({ person_id: person.id });

      candidates.push({
        source: 'internal',
        name: person.full_name,
        phones: contacts.filter(c => c.type === 'phone').map(c => c.value),
        emails: contacts.filter(c => c.type === 'email').map(c => c.value),
        addresses: addresses.map(a => `${a.line1}, ${a.city}, ${a.state} ${a.zip}`),
        raw: { person_id: person.id, nameMatch },
      });
    }
  }

  return candidates;
}

/**
 * Search PDF extracted data
 */
async function searchPDFData(base44, name, address, county) {
  // Get all documents with identity data
  const docs = await base44.asServiceRole.entities.Document.filter({ 
    usable_for_identity: true 
  });

  const candidates = [];

  for (const doc of docs) {
    if (doc.extracted_data) {
      const data = doc.extracted_data;
      
      if (data.owner_name) {
        const nameMatch = calculateNameSimilarity(data.owner_name, name);
        if (nameMatch > 0.4) {
          candidates.push({
            source: 'pdf',
            name: data.owner_name,
            phones: data.phone ? [data.phone] : [],
            emails: data.email ? [data.email] : [],
            addresses: data.mailing_address ? [data.mailing_address] : [],
            raw: { doc_id: doc.id, doc_name: doc.name, nameMatch },
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * Search public data (placeholder - would integrate with TruePeopleSearch or similar)
 */
async function searchPublicData(name, address, state) {
  // This is a placeholder for public data scraping
  // In production, this would call a third-party API or scraper
  
  // For now, return empty array
  // Real implementation would call APIs like:
  // - TruePeopleSearch
  // - FastPeopleSearch
  // - WhitePages API
  // - Public records databases
  
  return [];
}

/**
 * Merge candidates from different sources
 */
function mergeCandidates(internal, pdf, publicData) {
  const merged = [];
  const seen = new Set();

  // Helper to create unique key
  const getKey = (name, phone) => {
    const normName = name.toLowerCase().replace(/[^a-z]/g, '');
    const normPhone = phone?.replace(/\D/g, '') || '';
    return `${normName}-${normPhone}`;
  };

  // Process all sources
  for (const candidate of [...internal, ...pdf, ...publicData]) {
    const key = getKey(candidate.name, candidate.phones?.[0]);
    
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(candidate);
    } else {
      // Merge data with existing candidate
      const existing = merged.find(c => getKey(c.name, c.phones?.[0]) === key);
      if (existing) {
        existing.phones = [...new Set([...existing.phones, ...candidate.phones])];
        existing.emails = [...new Set([...existing.emails, ...candidate.emails])];
        existing.addresses = [...new Set([...existing.addresses, ...candidate.addresses])];
      }
    }
  }

  return merged;
}

/**
 * Score candidates based on matching logic
 */
function scoreCandidates(candidates, targetName, targetAddress) {
  return candidates.map(candidate => {
    let score = 0;
    const reasons = [];

    // Name matching
    const nameMatch = calculateNameSimilarity(candidate.name, targetName);
    if (nameMatch > 0.9) {
      score += 40;
      reasons.push('EXACT_NAME_MATCH');
    } else if (nameMatch > 0.7) {
      score += 25;
      reasons.push('STRONG_NAME_MATCH');
    } else if (nameMatch > 0.5) {
      score += 15;
      reasons.push('NAME_MATCH');
    }

    // Address matching
    if (targetAddress && candidate.addresses.length > 0) {
      const bestAddressMatch = Math.max(...candidate.addresses.map(addr => 
        calculateAddressSimilarity(addr, targetAddress)
      ));
      
      if (bestAddressMatch > 0.8) {
        score += 30;
        reasons.push('ADDRESS_MATCH');
      } else if (bestAddressMatch > 0.5) {
        score += 15;
        reasons.push('PARTIAL_ADDRESS_MATCH');
      }
    }

    // Source bonuses
    if (candidate.source === 'internal') {
      score += 10;
      reasons.push('EXISTING_RECORD');
    }
    if (candidate.source === 'pdf') {
      score += 15;
      reasons.push('PDF_EXTRACTED');
    }

    // Contact info bonus
    if (candidate.phones.length > 0) score += 5;
    if (candidate.emails.length > 0) score += 5;

    // Determine confidence
    let confidence = 'low';
    if (score >= 80) confidence = 'high';
    else if (score >= 50) confidence = 'medium';

    // Recommended action
    let action = 'ignore';
    if (score >= 80) action = 'use';
    else if (score >= 50) action = 'caution';

    return {
      ...candidate,
      score,
      confidence,
      reasons,
      action,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Calculate name similarity (0-1)
 */
function calculateNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;

  const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return 1.0;

  // Check if one is substring of other
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;

  // Simple Levenshtein-like scoring
  const maxLen = Math.max(n1.length, n2.length);
  let matches = 0;
  const minLen = Math.min(n1.length, n2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (n1[i] === n2[i]) matches++;
  }

  return matches / maxLen;
}

/**
 * Calculate address similarity (0-1)
 */
function calculateAddressSimilarity(addr1, addr2) {
  if (!addr1 || !addr2) return 0;

  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const a1 = normalize(addr1);
  const a2 = normalize(addr2);

  if (a1 === a2) return 1.0;
  if (a1.includes(a2) || a2.includes(a1)) return 0.7;

  // Check for common components (street number, street name)
  const words1 = addr1.toLowerCase().split(/\s+/);
  const words2 = addr2.toLowerCase().split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));

  return Math.min(commonWords.length / Math.max(words1.length, words2.length), 1.0);
}