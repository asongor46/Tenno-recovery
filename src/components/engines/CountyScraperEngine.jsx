// =====================================================
// UNIVERSAL COUNTY SCRAPER ENGINE
// =====================================================
// Central engine that coordinates all county-specific scraping operations
// Delegates to county profiles for parsing logic

/**
 * CountyScraperEngine.run()
 * 
 * Main entry point for all county scraping operations.
 * 
 * @param {Object} params
 * @param {string} params.countyId - County identifier (e.g., "broward_fl")
 * @param {string} params.operation - "SURPLUS_LIST" | "SALE_DETAIL" | "APPRAISER"
 * @param {Object} params.input - Operation-specific input data
 * 
 * @returns {Object} Normalized result based on operation type
 */

import { COUNTY_PROFILES } from '../countyProfiles/index.js';

export async function run({ countyId, operation, input }) {
  // Get county profile
  const profile = COUNTY_PROFILES[countyId];
  
  if (!profile) {
    return {
      status: 'error',
      errors: [`County profile not found: ${countyId}`],
      message: 'This county is not yet configured for automated scraping.',
    };
  }

  try {
    switch (operation) {
      case 'SURPLUS_LIST':
        return await runSurplusListScrape(profile, input);
      
      case 'SALE_DETAIL':
        return await runSaleDetailScrape(profile, input);
      
      case 'APPRAISER':
        return await runAppraiserScrape(profile, input);
      
      default:
        return {
          status: 'error',
          errors: [`Unknown operation: ${operation}`],
        };
    }
  } catch (error) {
    return {
      status: 'error',
      errors: [error.message],
      stack: error.stack,
    };
  }
}

/**
 * SURPLUS_LIST Operation
 * Scrapes or parses surplus list pages/PDFs
 */
async function runSurplusListScrape(profile, input) {
  if (!profile.parseSurplusList) {
    return {
      status: 'error',
      errors: ['Surplus list parsing not implemented for this county'],
      cases: [],
    };
  }

  // Fetch HTML/PDF if URL provided
  let content = input.html || input.pdfBuffer;
  
  if (!content && input.url) {
    const response = await fetch(input.url);
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('pdf')) {
        content = await response.arrayBuffer();
      } else {
        content = await response.text();
      }
    } else {
      return {
        status: 'error',
        errors: [`Failed to fetch URL: ${response.status}`],
        cases: [],
      };
    }
  }

  // Parse content using county profile
  const result = await profile.parseSurplusList(content);
  
  return {
    status: result.cases?.length > 0 ? 'ok' : 'partial',
    cases: result.cases || [],
    errors: result.errors || [],
  };
}

/**
 * SALE_DETAIL Operation
 * Scrapes individual sale detail pages for bid/surplus info
 */
async function runSaleDetailScrape(profile, input) {
  if (!profile.parseSaleDetail) {
    return {
      status: 'error',
      errors: ['Sale detail parsing not implemented for this county'],
    };
  }

  // Build URL from pattern if needed
  let url = input.url;
  if (!url && profile.saleDetailUrlPattern) {
    url = profile.saleDetailUrlPattern
      .replace('{taxDeedNumber}', input.taxDeedNumber || '')
      .replace('{parcelNumber}', input.parcelNumber || '');
  }

  if (!url) {
    return {
      status: 'error',
      errors: ['No URL provided and no URL pattern configured'],
    };
  }

  // Fetch page
  const response = await fetch(url);
  if (!response.ok) {
    return {
      status: 'error',
      errors: [`Failed to fetch sale detail: ${response.status}`],
    };
  }

  const html = await response.text();
  
  // Parse using county profile
  const result = await profile.parseSaleDetail(html, input);
  
  return {
    status: result.surplusAmount != null ? 'ok' : 'partial',
    ...result,
    errors: result.errors || [],
  };
}

/**
 * APPRAISER Operation
 * Scrapes property appraiser for owner/property info
 */
async function runAppraiserScrape(profile, input) {
  if (!profile.parseAppraiserPage) {
    return {
      status: 'error',
      errors: ['Appraiser parsing not implemented for this county'],
    };
  }

  // Build URL from pattern if needed
  let url = input.url;
  if (!url && profile.appraiserUrlPattern) {
    url = profile.appraiserUrlPattern
      .replace('{parcelNumber}', input.parcelNumber || '');
  }

  if (!url) {
    return {
      status: 'error',
      errors: ['No URL provided and no URL pattern configured'],
    };
  }

  // Fetch page
  const response = await fetch(url);
  if (!response.ok) {
    return {
      status: 'error',
      errors: [`Failed to fetch appraiser page: ${response.status}`],
    };
  }

  const html = await response.text();
  
  // Parse using county profile
  const result = await profile.parseAppraiserPage(html, input);
  
  return {
    status: result.ownerName ? 'ok' : 'partial',
    ...result,
    errors: result.errors || [],
  };
}