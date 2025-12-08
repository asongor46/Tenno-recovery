import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PHASE 1 - FUNCTION 3: Internal Deep Search
 * Given a Person, searches across all TENNO data for related info
 * Finds other cases, existing contacts, addresses from past interactions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { person_id, person_name, city, state, zip } = await req.json();
    
    if (!person_id && !person_name) {
      return Response.json({ 
        error: 'Must provide either person_id or person_name' 
      }, { status: 400 });
    }

    let personRecord = null;
    let personIds = [];

    // Step 1: Get Person record(s)
    if (person_id) {
      const persons = await base44.asServiceRole.entities.Person.filter({ id: person_id });
      personRecord = persons[0];
      personIds = [person_id];
    } else {
      // Search by name
      const persons = await base44.asServiceRole.entities.Person.filter({});
      
      // Manual fuzzy match on name
      const matches = persons.filter(p => {
        const fullNameLower = p.full_name?.toLowerCase() || '';
        const searchLower = person_name.toLowerCase();
        return fullNameLower.includes(searchLower) || searchLower.includes(fullNameLower);
      });
      
      personIds = matches.map(p => p.id);
      personRecord = matches[0];
    }

    if (!personRecord) {
      return Response.json({
        status: 'not_found',
        message: 'No matching Person found in database',
      });
    }

    // Step 2: Find all cases linked to this person
    const caseLinks = await base44.asServiceRole.entities.CasePersonLink.filter({
      person_id: personRecord.id,
    });

    const relatedCases = [];
    for (const link of caseLinks) {
      const cases = await base44.asServiceRole.entities.Case.filter({ id: link.case_id });
      if (cases[0]) {
        relatedCases.push({
          case_id: cases[0].id,
          case_number: cases[0].case_number,
          county: cases[0].county,
          surplus_amount: cases[0].surplus_amount,
          status: cases[0].status,
          role: link.role,
        });
      }
    }

    // Step 3: Find all contact points for this person
    const contacts = await base44.asServiceRole.entities.ContactPoint.filter({
      person_id: personRecord.id,
    });

    const phones = contacts.filter(c => c.type === 'phone');
    const emails = contacts.filter(c => c.type === 'email');

    // Step 4: Find all addresses for this person
    const addresses = await base44.asServiceRole.entities.Address.filter({
      person_id: personRecord.id,
    });

    const mailingAddresses = addresses.filter(a => a.type === 'mailing' && a.active_flag);
    const propertyAddresses = addresses.filter(a => a.type === 'property');
    const previousAddresses = addresses.filter(a => !a.active_flag);

    // Step 5: Find contact attempts history (if any cases exist)
    let contactHistory = [];
    if (relatedCases.length > 0) {
      contactHistory = await base44.asServiceRole.entities.ContactAttempt.filter({
        person_id: personRecord.id,
      }, '-created_date');
    }

    // Step 6: Look for similar persons (same location)
    let similarPersons = [];
    if (city && state) {
      const allAddresses = await base44.asServiceRole.entities.Address.filter({
        city: city,
        state: state,
      });
      
      const similarPersonIds = [...new Set(
        allAddresses
          .filter(a => a.person_id !== personRecord.id)
          .map(a => a.person_id)
      )];
      
      for (const pid of similarPersonIds.slice(0, 5)) {
        const persons = await base44.asServiceRole.entities.Person.filter({ id: pid });
        if (persons[0]) {
          similarPersons.push({
            person_id: persons[0].id,
            full_name: persons[0].full_name,
            relationship: 'same_city',
          });
        }
      }
    }

    return Response.json({
      status: 'success',
      person: personRecord,
      related_cases: relatedCases,
      contacts: {
        phones: phones.map(p => ({
          value: p.value,
          label: p.label,
          confidence: p.confidence,
          verified: p.verified,
          source: p.source_type,
        })),
        emails: emails.map(e => ({
          value: e.value,
          label: e.label,
          confidence: e.confidence,
          verified: e.verified,
          source: e.source_type,
        })),
      },
      addresses: {
        mailing: mailingAddresses.map(a => ({
          line1: a.line1,
          city: a.city,
          state: a.state,
          zip: a.zip,
          confidence: a.confidence,
        })),
        property: propertyAddresses.map(a => ({
          line1: a.line1,
          city: a.city,
          state: a.state,
          zip: a.zip,
        })),
        previous: previousAddresses.map(a => ({
          line1: a.line1,
          city: a.city,
          state: a.state,
          zip: a.zip,
        })),
      },
      contact_history: contactHistory.slice(0, 10).map(h => ({
        date: h.created_date,
        method: h.contact_method,
        result: h.result,
        notes: h.notes,
      })),
      similar_persons: similarPersons,
      summary: {
        total_cases: relatedCases.length,
        total_phones: phones.length,
        total_emails: emails.length,
        total_addresses: addresses.length,
        total_contact_attempts: contactHistory.length,
      },
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});