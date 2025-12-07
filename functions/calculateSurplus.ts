// =====================================================
// AUTOMATION OPPORTUNITY 1.2 - SURPLUS CALCULATION ENGINE
// =====================================================
// Auto-calculate surplus from: winning bid, tax debt, fees
// Formula: Surplus = Winning Bid – Total Owed – Fees
// Eliminates ALL guessing

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ADDED: County-specific fee structures
const COUNTY_FEE_STRUCTURES = {
  'Broward': {
    clerk_fee: 350,
    recording_fee: 150,
    publication_fee: 200,
    title_search_fee: 100,
    default_fees: 800, // Total if not itemized
  },
  'Miami-Dade': {
    clerk_fee: 400,
    recording_fee: 175,
    publication_fee: 250,
    default_fees: 825,
  },
  'Maricopa': {
    clerk_fee: 300,
    recording_fee: 125,
    publication_fee: 150,
    default_fees: 575,
  },
  // ADDED: Default fallback for unknown counties
  'default': {
    clerk_fee: 350,
    recording_fee: 150,
    publication_fee: 200,
    default_fees: 700,
  },
};

// REMOVED MOCK DATA - Now delegates to CountyScraperEngine
async function fetchSaleDetail(taxDeedNumber, parcelNumber, county, state) {
  // Map county to profile ID
  const normalizedCounty = county?.toLowerCase().replace(/\s+/g, '_');
  const normalizedState = state?.toLowerCase();
  const countyId = `${normalizedCounty}_${normalizedState}`;
  
  // Call CountyScraperEngine - SALE_DETAIL operation
  const scraperUrl = `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/invokeCountyScraper`;
  
  try {
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countyId,
        operation: 'SALE_DETAIL',
        input: { taxDeedNumber, parcelNumber },
      }),
    });
    
    if (!response.ok) {
      return { status: 'error', errors: [`HTTP ${response.status}`] };
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { status: 'error', errors: [error.message] };
  }
}

// ADDED: Main surplus calculation function
async function calculateSurplusAmount(data) {
  const { 
    winning_bid, 
    opening_bid, 
    tax_deed_number, 
    parcel_number, 
    county, 
    state,
    provided_surplus, // If surplus already known
  } = data;
  
  // ADDED: If surplus already provided with high confidence, return it
  if (provided_surplus && provided_surplus > 0) {
    return {
      status: 'success',
      surplus_amount: provided_surplus,
      calculation_method: 'provided',
      confidence: 'high',
      breakdown: {
        winning_bid: winning_bid,
        total_owed: winning_bid - provided_surplus,
        surplus: provided_surplus,
      },
      note: 'Surplus amount was provided from source',
    };
  }
  
  // REMOVED MOCK DATA - Now uses CountyScraperEngine for sale details
  
  // Fetch sale detail data from county scraper
  const saleDetail = await fetchSaleDetail(tax_deed_number, parcel_number, county, state);
  
  if (saleDetail.status === 'error' || !saleDetail.surplusAmount) {
    // If scraper doesn't have surplus, try to calculate from available data
    const feeStructure = COUNTY_FEE_STRUCTURES[county] || COUNTY_FEE_STRUCTURES['default'];
    
    if (saleDetail.winningBid && saleDetail.taxesOwed && saleDetail.fees) {
      // We have all components
      const calculatedSurplus = saleDetail.winningBid - saleDetail.taxesOwed - saleDetail.fees;
      
      return {
        status: 'calculated',
        surplus_amount: Math.max(0, calculatedSurplus),
        calculation_method: 'scraped_components',
        confidence: 'high',
        breakdown: {
          winning_bid: saleDetail.winningBid,
          taxes_owed: saleDetail.taxesOwed,
          fees: saleDetail.fees,
          surplus: calculatedSurplus,
        },
        note: 'Surplus calculated from scraped sale detail components',
      };
    } else if (winning_bid && opening_bid) {
      // Fallback to simplified estimation
      const simplifiedSurplus = winning_bid - opening_bid;
      return {
        status: 'estimated',
        surplus_amount: Math.max(0, simplifiedSurplus),
        calculation_method: 'simplified_estimate',
        confidence: 'low',
        breakdown: {
          winning_bid: winning_bid,
          opening_bid: opening_bid,
          estimated_surplus: simplifiedSurplus,
        },
        warning: 'Sale detail data unavailable - using simplified calculation',
        note: 'This is an ESTIMATE. Verify with county records.',
      };
    } else {
      // No data available
      return {
        status: 'not_resolved',
        surplus_amount: null,
        calculation_method: 'none',
        confidence: 'unknown',
        note: 'Unable to calculate surplus - insufficient data. Manual lookup required.',
      };
    }
  }
  
  // Scraper returned surplus directly
  return {
    status: 'success',
    surplus_amount: saleDetail.surplusAmount,
    calculation_method: 'scraped_surplus',
    confidence: 'high',
    breakdown: {
      winning_bid: saleDetail.winningBid,
      opening_bid: saleDetail.openingBid,
      taxes_owed: saleDetail.taxesOwed,
      fees: saleDetail.fees,
      surplus: saleDetail.surplusAmount,
    },
    note: 'Surplus obtained directly from county sale detail page',
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
    const payload = await req.json();
    
    const { 
      winning_bid, 
      county, 
    } = payload;
    
    if (!winning_bid || !county) {
      return Response.json({ 
        error: 'Missing required fields: winning_bid, county' 
      }, { status: 400 });
    }

    // ADDED: Calculate surplus
    const result = await calculateSurplusAmount(payload);

    return Response.json({
      status: 'success',
      ...result,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});