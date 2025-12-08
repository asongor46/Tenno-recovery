import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PHASE 3 - Contact Confidence Scoring Engine
 * Calculates confidence scores for ContactPoint records
 * Updates Case.owner_confidence based on best available contact
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, person_id, contact_point_id } = await req.json();
    
    if (!case_id) {
      return Response.json({ 
        error: 'Missing case_id parameter' 
      }, { status: 400 });
    }

    // Load case
    const cases = await base44.asServiceRole.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Get primary person for this case
    const links = await base44.asServiceRole.entities.CasePersonLink.filter({
      case_id: case_id,
      role: 'primary_owner',
    });
    
    const primaryPersonId = person_id || links[0]?.person_id;
    
    if (!primaryPersonId) {
      return Response.json({
        status: 'no_person',
        message: 'No primary owner linked to case',
      });
    }

    // Get all contacts for this person
    let contacts = [];
    if (contact_point_id) {
      const specificContact = await base44.asServiceRole.entities.ContactPoint.filter({ id: contact_point_id });
      contacts = specificContact;
    } else {
      contacts = await base44.asServiceRole.entities.ContactPoint.filter({ person_id: primaryPersonId });
    }

    // Get addresses for comparison
    const addresses = await base44.asServiceRole.entities.Address.filter({ person_id: primaryPersonId });

    // Calculate confidence for each contact
    const scoredContacts = [];
    
    for (const contact of contacts) {
      let score = 0;
      const reasons = [];

      // Base score from source type
      if (contact.source_type === 'manual') {
        score += 2;
        reasons.push('Manually entered');
      } else if (contact.source_type === 'pdf_extraction') {
        score += 3;
        reasons.push('Extracted from official documents');
      } else if (contact.source_type === 'people_finder_internal') {
        score += 2;
        reasons.push('Found in internal records');
      }

      // Verified contact
      if (contact.verified) {
        score += 5;
        reasons.push('Contact verified');
      }

      // Check if related address matches case
      const propertyMatch = addresses.some(addr => 
        addr.type === 'property' && 
        caseData.property_address?.toLowerCase().includes(addr.line1?.toLowerCase())
      );
      
      const mailingMatch = addresses.some(addr => 
        addr.type === 'mailing' && 
        caseData.owner_address?.toLowerCase().includes(addr.line1?.toLowerCase())
      );

      if (propertyMatch) {
        score += 4;
        reasons.push('Address matches case property');
      } else if (mailingMatch) {
        score += 3;
        reasons.push('Address matches mailing address');
      }

      // Same city/state
      const cityStateMatch = addresses.some(addr =>
        addr.city?.toLowerCase() === caseData.city?.toLowerCase() &&
        addr.state?.toLowerCase() === caseData.state?.toLowerCase()
      );
      
      if (cityStateMatch && !propertyMatch && !mailingMatch) {
        score += 2;
        reasons.push('Same city & state as case');
      }

      // Check contact attempts history
      const attempts = await base44.asServiceRole.entities.ContactAttempt.filter({
        person_id: primaryPersonId,
        value_used: contact.value,
      });

      // Successful contact attempt
      const successfulAttempt = attempts.some(a => 
        a.result === 'spoke_to_owner' || 
        a.result === 'owner_interested'
      );
      
      if (successfulAttempt) {
        score += 5;
        reasons.push('Confirmed by successful contact');
      }

      // Wrong number marked
      const wrongNumber = attempts.some(a => 
        a.result === 'wrong_number' || 
        a.result === 'disconnected'
      );
      
      if (wrongNumber) {
        score = -999;
        reasons.push('INVALID - marked as wrong/disconnected');
      }

      // Determine confidence level
      let confidenceLevel = 'low';
      if (score >= 10) {
        confidenceLevel = 'high';
      } else if (score >= 5) {
        confidenceLevel = 'medium';
      } else if (score < 0) {
        confidenceLevel = 'low';
      }

      // Update contact confidence
      await base44.asServiceRole.entities.ContactPoint.update(contact.id, {
        confidence: confidenceLevel,
      });

      scoredContacts.push({
        contact_id: contact.id,
        value: contact.value,
        type: contact.type,
        score,
        confidence: confidenceLevel,
        reasons,
      });
    }

    // Update case owner_confidence with highest confidence
    const bestContact = scoredContacts
      .filter(c => c.score >= 0)
      .sort((a, b) => b.score - a.score)[0];

    if (bestContact) {
      await base44.asServiceRole.entities.Case.update(case_id, {
        owner_confidence: bestContact.confidence,
      });
    }

    return Response.json({
      status: 'success',
      scored_contacts: scoredContacts,
      best_confidence: bestContact?.confidence || 'unknown',
      case_updated: !!bestContact,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});