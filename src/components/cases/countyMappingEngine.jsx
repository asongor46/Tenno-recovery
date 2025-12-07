// =====================================================
// TENNO RECOVERY - UNIVERSAL COUNTY MAPPING (UCM) ENGINE
// =====================================================
// Handles ALL county types and formats:
// - PDF surplus lists
// - HTML tables
// - Auction platforms
// - JSON/CSV feeds
// - Multi-step docket systems

// Domain-to-County mapping database
export const DOMAIN_TO_COUNTY = {
  'broward.deedauction.net': { county: 'Broward', state: 'FL', type: 'auction_platform' },
  'miami.realauction.com': { county: 'Miami-Dade', state: 'FL', type: 'auction_platform' },
  'bid4assets.com/pa': { county: 'Pennsylvania', state: 'PA', type: 'auction_platform' },
  'bid4assets.com/md': { county: 'Maryland', state: 'MD', type: 'auction_platform' },
  'realauction.com': { county: 'Unknown', state: 'FL', type: 'auction_platform' },
  'maricopa.gov': { county: 'Maricopa', state: 'AZ', type: 'foreclosure_surplus' },
  'fultonclerk.org': { county: 'Fulton', state: 'GA', type: 'docket_based' },
  'pbcgov.com': { county: 'Palm Beach', state: 'FL', type: 'surplus_list' },
  'collierclerk.com': { county: 'Collier', state: 'FL', type: 'surplus_list' },
};

// County mapping profiles - defines how to extract data from each source type
export const COUNTY_PROFILES = {
  broward: {
    name: 'Broward County, FL',
    source: 'broward.deedauction.net',
    type: 'tax_deed_sale_results',
    fields: {
      parcel: 'Parcel #',
      sale_date: 'Sale Date',
      winning_bid: 'Winning Bid',
      opening_bid: 'Opening Bid',
      certificate: 'Certificate #',
    },
    surplus_strategy: 'calculate_after_owner_lookup',
    owner_strategy: 'parcel_lookup_required',
    confidence_base: 70, // Base confidence when data complete
  },
  maricopa: {
    name: 'Maricopa County, AZ',
    source: 'maricopa.gov',
    type: 'foreclosure_surplus',
    fields: {
      owner: 'Owner',
      case_number: 'Case #',
      surplus_amount: 'Surplus',
      property_address: 'Property Address',
    },
    surplus_strategy: 'direct_from_source',
    owner_strategy: 'direct_from_source',
    confidence_base: 95,
  },
  fulton: {
    name: 'Fulton County, GA',
    source: 'fultonclerk.org',
    type: 'docket_based',
    requires_clickthrough: true,
    surplus_in_document: true,
    fields: {
      case_number: 'Case Number',
      owner: 'Defendant',
      property_address: 'Property',
    },
    surplus_strategy: 'extract_from_pdf',
    owner_strategy: 'direct_from_source',
    confidence_base: 85,
  },
  generic_pdf: {
    name: 'Generic PDF Surplus List',
    type: 'pdf_surplus_list',
    fields: {
      owner: ['Owner', 'Owner Name', 'Property Owner', 'Defendant'],
      case_number: ['Case #', 'Case Number', 'Case No', 'Docket'],
      surplus_amount: ['Surplus', 'Excess', 'Amount', 'Proceeds'],
      property_address: ['Address', 'Property Address', 'Location'],
    },
    surplus_strategy: 'direct_from_source',
    owner_strategy: 'direct_from_source',
    confidence_base: 80,
  },
  generic_html_table: {
    name: 'Generic HTML Table',
    type: 'html_table',
    fields: {
      owner: ['Owner', 'Owner Name', 'Property Owner'],
      case_number: ['Case #', 'Case Number', 'Case No'],
      surplus_amount: ['Surplus', 'Excess', 'Amount'],
      property_address: ['Address', 'Property Address'],
      parcel: ['Parcel', 'Parcel #', 'Parcel Number'],
    },
    surplus_strategy: 'extract_or_calculate',
    owner_strategy: 'extract_or_lookup',
    confidence_base: 75,
  },
};

// Source type detection
export function detectSourceType(data) {
  const { url, content, fileType } = data;
  
  // Check if it's a known domain
  if (url) {
    for (const [domain, info] of Object.entries(DOMAIN_TO_COUNTY)) {
      if (url.includes(domain)) {
        return {
          type: info.type,
          county: info.county,
          state: info.state,
          confidence: 'high',
        };
      }
    }
    
    // Check for auction platform indicators
    if (url.includes('bid4assets') || url.includes('realauction') || url.includes('deedauction')) {
      return { type: 'auction_platform', confidence: 'medium' };
    }
    
    // Check for court/clerk sites
    if (url.includes('clerk') || url.includes('court')) {
      return { type: 'docket_based', confidence: 'medium' };
    }
    
    // Check for property appraiser
    if (url.includes('appraiser') || url.includes('property')) {
      return { type: 'property_appraiser', confidence: 'medium' };
    }
  }
  
  // Check file type
  if (fileType === 'application/pdf') {
    return { type: 'pdf_surplus_list', confidence: 'medium' };
  }
  
  // Check content for HTML table
  if (content && content.includes('<table>')) {
    return { type: 'html_table', confidence: 'high' };
  }
  
  // Check for JSON
  if (content && (content.trim().startsWith('{') || content.trim().startsWith('['))) {
    return { type: 'json_feed', confidence: 'high' };
  }
  
  // Default
  return { type: 'unknown', confidence: 'low' };
}

// County auto-detection from URL
export function detectCounty(url) {
  for (const [domain, info] of Object.entries(DOMAIN_TO_COUNTY)) {
    if (url.includes(domain)) {
      return info;
    }
  }
  
  // Try to extract from URL patterns
  const countyPatterns = [
    /\/([a-z]+)county/i,
    /([a-z]+)clerk/i,
    /([a-z]+)\.gov/i,
  ];
  
  for (const pattern of countyPatterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        county: match[1].charAt(0).toUpperCase() + match[1].slice(1),
        state: 'Unknown',
        type: 'unknown',
      };
    }
  }
  
  return null;
}

// Get appropriate mapping profile
export function getMappingProfile(countyName, sourceType) {
  const key = countyName?.toLowerCase().replace(/\s+/g, '_').replace(',', '');
  
  // Try exact county match
  if (COUNTY_PROFILES[key]) {
    return COUNTY_PROFILES[key];
  }
  
  // Try source type match
  if (sourceType === 'pdf_surplus_list' || sourceType === 'pdf') {
    return COUNTY_PROFILES.generic_pdf;
  }
  
  if (sourceType === 'html_table' || sourceType === 'auction_platform') {
    return COUNTY_PROFILES.generic_html_table;
  }
  
  // Default fallback
  return COUNTY_PROFILES.generic_html_table;
}

// Surplus calculation strategies
export function calculateSurplus(strategy, data) {
  switch (strategy) {
    case 'direct_from_source':
      // Surplus is explicitly provided
      return {
        amount: parseFloat(data.surplus_amount?.replace(/[^0-9.-]/g, '') || 0),
        confidence: 'high',
        method: 'direct',
      };
      
    case 'calculate_after_owner_lookup':
      // Surplus = Winning Bid - Opening Bid (simplified)
      const winning = parseFloat(data.winning_bid?.replace(/[^0-9.-]/g, '') || 0);
      const opening = parseFloat(data.opening_bid?.replace(/[^0-9.-]/g, '') || 0);
      const calculated = Math.max(0, winning - opening);
      return {
        amount: calculated,
        confidence: calculated > 0 ? 'medium' : 'low',
        method: 'calculated',
        note: 'Winning bid minus opening bid (may need debt verification)',
      };
      
    case 'extract_or_calculate':
      // Try direct first, then calculate
      if (data.surplus_amount) {
        return calculateSurplus('direct_from_source', data);
      } else if (data.winning_bid && data.opening_bid) {
        return calculateSurplus('calculate_after_owner_lookup', data);
      }
      return {
        amount: 0,
        confidence: 'unknown',
        method: 'unavailable',
        note: 'Insufficient data to calculate surplus',
      };
      
    case 'extract_from_pdf':
      // Requires OCR/LLM extraction
      return {
        amount: parseFloat(data.surplus_amount?.replace(/[^0-9.-]/g, '') || 0),
        confidence: 'medium',
        method: 'pdf_extraction',
        note: 'Extracted from document',
      };
      
    default:
      return {
        amount: 0,
        confidence: 'unknown',
        method: 'unknown',
      };
  }
}

// Owner resolution strategies
export function resolveOwner(strategy, data) {
  switch (strategy) {
    case 'direct_from_source':
      return {
        name: data.owner || data.owner_name || '',
        confidence: data.owner ? 'high' : 'unknown',
        method: 'direct',
      };
      
    case 'parcel_lookup_required':
      return {
        name: data.owner || '',
        confidence: 'low',
        method: 'requires_lookup',
        note: 'Use parcel # to query property appraiser',
        parcel: data.parcel,
      };
      
    case 'extract_or_lookup':
      if (data.owner || data.owner_name) {
        return resolveOwner('direct_from_source', data);
      } else if (data.parcel) {
        return resolveOwner('parcel_lookup_required', data);
      }
      return {
        name: '',
        confidence: 'unknown',
        method: 'unavailable',
        note: 'No owner name or parcel ID provided',
      };
      
    default:
      return {
        name: '',
        confidence: 'unknown',
        method: 'unknown',
      };
  }
}

// Calculate overall extraction confidence
export function calculateConfidence(caseData, profile) {
  let score = profile.confidence_base || 70;
  
  // Adjust based on completeness
  if (caseData.owner_name) score += 10;
  if (caseData.property_address) score += 5;
  if (caseData.case_number) score += 5;
  if (caseData.surplus_amount > 0) score += 10;
  
  // Cap at 100
  score = Math.min(100, score);
  
  // Convert to label
  if (score >= 85) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}