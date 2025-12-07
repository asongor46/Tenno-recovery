// =====================================================
// AUTOMATION OPPORTUNITY 1.3 - PARCEL → OWNER RESOLVER
// =====================================================
// Given a parcel number and county, query property appraiser
// and extract: owner, mailing address, property address,
// deed history, homestead status, ownership changes

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ADDED: Property appraiser API endpoints by county
const PROPERTY_APPRAISER_APIS = {
  'Broward': {
    url: 'https://web.bcpa.net/bcpaclient/',
    search_endpoint: '/api/v1/search',
    detail_endpoint: '/api/v1/detail',
    supports_api: false, // Currently requires scraping
  },
  'Miami-Dade': {
    url: 'https://www.miamidade.gov/Apps/PA/propertysearch/',
    search_endpoint: '/api/search',
    supports_api: false,
  },
  'Maricopa': {
    url: 'https://mcassessor.maricopa.gov/',
    search_endpoint: '/api/v1/search',
    supports_api: true,
  },
  // ADDED: More counties can be added here
};

// ADDED: Parse owner name variations and normalize
function normalizeOwnerName(rawName) {
  if (!rawName) return null;
  
  // Remove common suffixes that cause mismatches
  let normalized = rawName
    .replace(/\s+(JR|SR|II|III|IV)\s*$/i, '')
    .replace(/\s+TRUSTEE\s*$/i, '')
    .replace(/\s+TRUST\s*$/i, '')
    .trim();
  
  return {
    full_name: rawName,
    normalized_name: normalized,
    variations: [
      rawName,
      normalized,
      rawName.replace(/\s+/g, ' '), // Collapse spaces
    ],
  };
}

// REMOVED MOCK DATA - Now uses CountyScraperEngine
async function resolveParcel(parcelNumber, county, state) {
  // Map county to profile ID
  const normalizedCounty = county?.toLowerCase().replace(/\s+/g, '_');
  const normalizedState = state?.toLowerCase();
  const countyId = `${normalizedCounty}_${normalizedState}`;
  
  // Call CountyScraperEngine - APPRAISER operation
  const scraperUrl = `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/invokeCountyScraper`;
  
  try {
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countyId,
        operation: 'APPRAISER',
        input: { parcelNumber },
      }),
    });
    
    if (!response.ok) {
      return {
        status: 'error',
        owner_name: null,
        property_address: null,
        mailing_address: null,
        confidence: 'unknown',
        note: `Failed to fetch appraiser data: ${response.status}`,
        requires_manual_lookup: true,
      };
    }
    
    const result = await response.json();
    
    if (result.status === 'error') {
      return {
        status: 'not_implemented',
        owner_name: null,
        property_address: null,
        mailing_address: null,
        confidence: 'unknown',
        note: result.errors?.join('; ') || 'County profile not configured',
        requires_manual_lookup: true,
      };
    }
    
    // Map scraper result to expected format
    return {
      status: result.status === 'ok' ? 'success' : 'partial',
      owner_name: result.ownerName || null,
      owner_normalized: normalizeOwnerName(result.ownerName),
      property_address: result.propertyAddress || null,
      mailing_address: result.mailingAddress || result.propertyAddress || null,
      mailing_same_as_property: result.mailingAddress === result.propertyAddress,
      homestead_status: result.homestead,
      confidence: result.ownerName ? 'high' : 'unknown',
      source: 'property_appraiser_scrape',
      fetched_at: new Date().toISOString(),
      warnings: result.errors || [],
      note: result.errors?.length > 0 ? result.errors.join('; ') : null,
    };
  } catch (error) {
    return {
      status: 'error',
      owner_name: null,
      property_address: null,
      mailing_address: null,
      confidence: 'unknown',
      note: `Scraper error: ${error.message}`,
      requires_manual_lookup: true,
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request payload
    const { parcel_number, county, state } = await req.json();
    
    if (!parcel_number || !county) {
      return Response.json({ 
        error: 'Missing required fields: parcel_number, county' 
      }, { status: 400 });
    }

    // ADDED: Resolve parcel to owner
    const ownerData = await resolveParcel(parcel_number, county, state);
    
    // ADDED: If successful, optionally create/update Person record
    if (ownerData.status === 'success' && ownerData.owner_name) {
      // Check if person already exists
      const existingPersons = await base44.asServiceRole.entities.Person.filter({
        full_name: ownerData.owner_name,
      });
      
      let personId = null;
      
      if (existingPersons.length === 0) {
        // Create new person record
        const person = await base44.asServiceRole.entities.Person.create({
          full_name: ownerData.owner_name,
          first_name: ownerData.owner_normalized?.normalized_name?.split(' ')[0] || null,
          last_name: ownerData.owner_normalized?.normalized_name?.split(' ').slice(-1)[0] || null,
          aliases: ownerData.owner_normalized?.variations || [],
        });
        personId = person.id;
        
        // ADDED: Create contact points (addresses)
        if (ownerData.mailing_address) {
          await base44.asServiceRole.entities.Address.create({
            person_id: personId,
            line1: ownerData.mailing_address,
            city: county,
            state: state,
            type: 'mailing',
            source_type: 'property_appraiser_lookup',
            confidence: ownerData.confidence,
          });
        }
        
        if (ownerData.property_address && !ownerData.mailing_same_as_property) {
          await base44.asServiceRole.entities.Address.create({
            person_id: personId,
            line1: ownerData.property_address,
            city: county,
            state: state,
            type: 'property',
            source_type: 'property_appraiser_lookup',
            confidence: ownerData.confidence,
          });
        }
      } else {
        personId = existingPersons[0].id;
      }
      
      ownerData.person_id = personId;
    }

    return Response.json({
      status: 'success',
      parcel_number,
      county,
      state,
      owner_data: ownerData,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});