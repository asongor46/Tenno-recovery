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

// ADDED: Main parcel resolution function
async function resolveParcel(parcelNumber, county, state) {
  const appraiserInfo = PROPERTY_APPRAISER_APIS[county];
  
  if (!appraiserInfo) {
    // Fallback: return placeholder with note
    return {
      status: 'api_not_configured',
      owner_name: null,
      property_address: null,
      mailing_address: null,
      homestead_status: null,
      last_sale_date: null,
      deed_type: null,
      confidence: 'unknown',
      note: `Property appraiser API not configured for ${county} County`,
      requires_manual_lookup: true,
    };
  }
  
  // TODO: Implement actual API/scraping logic
  // For now, return structured mock data showing what WILL be fetched
  
  // Real implementation would:
  // 1. Query property appraiser by parcel
  // 2. Parse HTML/JSON response
  // 3. Extract all relevant fields
  // 4. Normalize owner names
  // 5. Validate data completeness
  
  const mockOwnerData = {
    status: 'success',
    
    // ADDED: Owner information
    owner_name: `SMITH, JOHN A`, // Raw from property appraiser
    owner_normalized: normalizeOwnerName('SMITH, JOHN A'),
    
    // ADDED: Property details
    property_address: `123 Main St, ${county}, ${state} 33301`,
    property_type: 'Single Family',
    
    // ADDED: Mailing address (critical for contact)
    mailing_address: `PO Box 456, ${county}, ${state} 33302`,
    mailing_same_as_property: false,
    
    // ADDED: Homestead status (affects claim eligibility)
    homestead_status: true,
    homestead_exemption_amount: 50000,
    
    // ADDED: Deed history
    last_sale_date: '2020-05-15',
    last_sale_amount: 250000,
    deed_type: 'Warranty Deed',
    deed_book: '12345',
    deed_page: '678',
    
    // ADDED: Ownership timeline (helps with verification)
    ownership_changes: [
      {
        date: '2020-05-15',
        type: 'Purchase',
        from: 'Previous Owner',
        to: 'SMITH, JOHN A',
      },
    ],
    
    // ADDED: Tax information
    assessed_value: 300000,
    tax_year: 2024,
    
    // ADDED: Confidence scoring
    confidence: 'high', // Would be 'high' with real API data
    data_completeness: 95, // Percentage of fields populated
    
    // ADDED: Source tracking
    source: 'property_appraiser',
    fetched_at: new Date().toISOString(),
    
    // ADDED: Warnings/notes
    warnings: [],
    note: 'Mock data - requires property appraiser API integration',
  };
  
  return mockOwnerData;
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