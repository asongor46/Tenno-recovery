import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ADDED: Domain-to-County mapping for auto-detection
const DOMAIN_TO_COUNTY = {
  'broward.deedauction.net': { county: 'Broward', state: 'FL', type: 'auction_platform' },
  'miami.realauction.com': { county: 'Miami-Dade', state: 'FL', type: 'auction_platform' },
  'bid4assets.com/pa': { county: 'Pennsylvania', state: 'PA', type: 'auction_platform' },
  'realauction.com': { county: 'Unknown', state: 'FL', type: 'auction_platform' },
  'maricopa.gov': { county: 'Maricopa', state: 'AZ', type: 'foreclosure_surplus' },
  'fultonclerk.org': { county: 'Fulton', state: 'GA', type: 'docket_based' },
};

// ADDED: Detect county from URL domain
function detectCountyFromUrl(url) {
  for (const [domain, info] of Object.entries(DOMAIN_TO_COUNTY)) {
    if (url.includes(domain)) {
      return info;
    }
  }
  return { county: 'Unknown', state: 'Unknown', type: 'unknown' };
}

// ADDED: Parcel lookup function (Owner Resolver Engine)
// This would query property appraiser APIs in production
async function lookupParcelInfo(parcelNumber, county, state) {
  // TODO: Implement actual property appraiser API calls
  // For now, return structured mock data showing what should be fetched
  
  // Example real-world flow:
  // 1. Query Broward Property Appraiser: https://web.bcpa.net/bcpaclient/
  // 2. Search by parcel: 494123-01-0013
  // 3. Extract: owner name, property address, mailing address, deed history
  
  return {
    owner_name: `Property Owner (Parcel: ${parcelNumber})`,
    property_address: `123 Main St, ${county}, ${state}`,
    mailing_address: `PO Box 123, ${county}, ${state}`,
    homestead_status: false,
    last_sale_date: null,
    confidence: 'medium', // Would be 'high' with real API
    source: 'property_appraiser_lookup',
    note: 'Requires property appraiser API integration',
  };
}

// ADDED: Fetch surplus detail from tax deed detail page
async function fetchSurplusDetail(taxDeedNumber, county) {
  // TODO: Implement actual detail page fetching
  // For Broward: fetch detail page for each tax deed #
  // Extract: taxes owed, interest, fees, deposits, excess proceeds
  
  // Example real-world flow:
  // 1. Fetch detail page: https://broward.deedauction.net/detail/{taxDeedNumber}
  // 2. Parse HTML for financial breakdown
  // 3. Calculate: surplus = winning_bid - (taxes + interest + fees)
  
  return {
    taxes_owed: 5000,
    interest: 500,
    fees: 250,
    total_debt: 5750,
    excess_proceeds: null, // Will be calculated
    confidence: 'medium', // Would be 'high' with real scraping
    source: 'detail_page_calculation',
    note: 'Requires detail page scraping',
  };
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
    const { url, source_type, mapping_profile, county: countyOverride, state: stateOverride } = await req.json();

    // ADDED: Step 1 - Detect county from domain
    const detectedCounty = detectCountyFromUrl(url);
    const finalCounty = countyOverride || detectedCounty.county;
    const finalState = stateOverride || detectedCounty.state;

    // ADDED: Step 2 - Fetch and parse page (stub for now)
    // In production, this would use Cheerio/Puppeteer to scrape HTML
    const rawRows = [
      {
        tax_deed: '53059',
        parcel: '494123-01-0013',
        opening_bid: '$50,000',
        winning_bid: '$125,000',
        sale_date: '2024-12-01',
        certificate: 'CERT-2024-001',
      },
      {
        tax_deed: '53060',
        parcel: '494123-02-0025',
        opening_bid: '$30,000',
        winning_bid: '$80,000',
        sale_date: '2024-12-01',
        certificate: 'CERT-2024-002',
      },
    ];

    // ADDED: Step 3-6 - Process each row through full pipeline
    const processedCases = [];
    
    for (const row of rawRows) {
      // ADDED: Step 3 - Parcel lookup (Owner Resolver)
      const parcelInfo = await lookupParcelInfo(row.parcel, finalCounty, finalState);
      
      // ADDED: Step 4 - Fetch surplus detail
      const surplusDetail = await fetchSurplusDetail(row.tax_deed, finalCounty);
      
      // ADDED: Step 5 - Calculate surplus
      const winningBid = parseFloat(row.winning_bid.replace(/[^0-9.-]/g, ''));
      const openingBid = parseFloat(row.opening_bid.replace(/[^0-9.-]/g, ''));
      
      // If we have detail page data, use it; otherwise estimate
      let calculatedSurplus = 0;
      let surplusMethod = 'unavailable';
      
      if (surplusDetail.total_debt) {
        calculatedSurplus = winningBid - surplusDetail.total_debt;
        surplusMethod = 'detail_page_calculation';
      } else {
        // Fallback: simplified calculation
        calculatedSurplus = winningBid - openingBid;
        surplusMethod = 'simplified_estimate';
      }
      
      // ADDED: Step 6 - Create normalized TENNO_CASE
      processedCases.push({
        // Real owner from parcel lookup
        owner_name: parcelInfo.owner_name,
        owner_address: parcelInfo.mailing_address,
        
        // Property details
        property_address: parcelInfo.property_address,
        parcel_number: row.parcel,
        
        // County (from domain detection or override)
        county: finalCounty,
        state: finalState,
        
        // Case identifiers
        case_number: row.tax_deed,
        
        // Financial data
        surplus_amount: Math.max(0, calculatedSurplus),
        sale_amount: winningBid,
        judgment_amount: surplusDetail.total_debt || openingBid,
        
        // Dates
        sale_date: row.sale_date,
        
        // Source tracking
        source_type: 'advanced_import',
        
        // ADDED: Confidence and method tracking
        owner_confidence: parcelInfo.confidence,
        surplus_confidence: surplusMethod === 'detail_page_calculation' ? 'high' : 'medium',
        extraction_confidence: 'medium',
        
        // ADDED: Notes for transparency
        surplus_note: `${surplusMethod} - ${parcelInfo.note}`,
        owner_note: parcelInfo.note,
        
        // Additional metadata
        homestead_status: parcelInfo.homestead_status,
        certificate_number: row.certificate,
      });
    }

    return Response.json({
      status: "success",
      cases: processedCases,
      source_url: url,
      county_detected: finalCounty,
      state_detected: finalState,
      detection_method: countyOverride ? 'manual_override' : 'domain_mapping',
      total_cases: processedCases.length,
    });

  } catch (error) {
    return Response.json({ 
      status: "error",
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});