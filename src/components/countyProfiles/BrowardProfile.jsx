// =====================================================
// BROWARD COUNTY, FL - SCRAPER PROFILE
// =====================================================
// County-specific parsing logic for Broward County

export const BrowardProfile = {
  id: 'broward_fl',
  name: 'Broward County, FL',
  
  // URL patterns
  surplusListUrl: 'https://broward.deedauction.net/results',
  saleDetailUrlPattern: 'https://broward.deedauction.net/details/{taxDeedNumber}',
  appraiserUrlPattern: 'https://web.bcpa.net/bcpaclient/PropertyDetail.aspx?prop_id={parcelNumber}',
  
  /**
   * Parse Broward surplus list page
   * @param {string|Buffer} content - HTML or PDF content
   * @returns {Object} { cases: [...], errors: [...] }
   */
  async parseSurplusList(content) {
    const cases = [];
    const errors = [];
    
    try {
      // REAL IMPLEMENTATION: Parse Broward HTML table
      // Example structure from broward.deedauction.net:
      // <tr>
      //   <td class="case-number">2024-12345</td>
      //   <td class="parcel">12-34-56-789</td>
      //   <td class="address">123 Main St</td>
      //   <td class="surplus">$50,000.00</td>
      // </tr>
      
      if (typeof content === 'string' && content.includes('<table')) {
        // HTML table parsing
        const rows = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        
        for (const row of rows.slice(1)) { // Skip header
          try {
            const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
            
            if (cells.length >= 4) {
              const caseNumber = cells[0]?.replace(/<[^>]*>/g, '').trim();
              const parcelNumber = cells[1]?.replace(/<[^>]*>/g, '').trim();
              const propertyAddress = cells[2]?.replace(/<[^>]*>/g, '').trim();
              const surplusText = cells[3]?.replace(/<[^>]*>/g, '').trim();
              
              const surplusAmount = parseFloat(surplusText.replace(/[$,]/g, ''));
              
              if (caseNumber && !isNaN(surplusAmount)) {
                cases.push({
                  caseNumber,
                  parcelNumber,
                  propertyAddress,
                  surplusAmount,
                  county: 'Broward',
                  state: 'FL',
                  source: 'broward_deedauction',
                });
              }
            }
          } catch (err) {
            errors.push(`Failed to parse row: ${err.message}`);
          }
        }
      } else {
        return {
          status: 'unimplemented',
          cases: [],
          errors: ['PDF parsing or alternative format not yet implemented for Broward'],
        };
      }
    } catch (err) {
      errors.push(`Parse error: ${err.message}`);
    }
    
    return { cases, errors };
  },
  
  /**
   * Parse Broward sale detail page
   * @param {string} html - HTML content
   * @param {Object} input - Input params
   * @returns {Object} Sale detail data
   */
  async parseSaleDetail(html, input) {
    const errors = [];
    
    try {
      // REAL IMPLEMENTATION: Extract from Broward sale detail page
      // Look for specific selectors or patterns:
      // - Opening bid amount
      // - Winning bid amount
      // - Taxes owed
      // - Fees
      // - Calculated surplus
      
      const openingBidMatch = html.match(/Opening Bid[:\s]*\$?([\d,]+\.?\d*)/i);
      const winningBidMatch = html.match(/Winning Bid[:\s]*\$?([\d,]+\.?\d*)/i);
      const taxesMatch = html.match(/Taxes Owed[:\s]*\$?([\d,]+\.?\d*)/i);
      const feesMatch = html.match(/Fees[:\s]*\$?([\d,]+\.?\d*)/i);
      
      const openingBid = openingBidMatch ? parseFloat(openingBidMatch[1].replace(/,/g, '')) : null;
      const winningBid = winningBidMatch ? parseFloat(winningBidMatch[1].replace(/,/g, '')) : null;
      const taxesOwed = taxesMatch ? parseFloat(taxesMatch[1].replace(/,/g, '')) : null;
      const fees = feesMatch ? parseFloat(feesMatch[1].replace(/,/g, '')) : null;
      
      let surplusAmount = null;
      if (winningBid != null && taxesOwed != null && fees != null) {
        surplusAmount = winningBid - taxesOwed - fees;
      }
      
      if (openingBid === null && winningBid === null) {
        errors.push('Could not extract bid amounts from page');
      }
      
      return {
        parcelNumber: input.parcelNumber,
        openingBid,
        winningBid,
        taxesOwed,
        fees,
        surplusAmount,
        errors,
      };
    } catch (err) {
      return {
        status: 'error',
        errors: [`Parse error: ${err.message}`],
      };
    }
  },
  
  /**
   * Parse Broward property appraiser page
   * @param {string} html - HTML content
   * @param {Object} input - Input params
   * @returns {Object} Owner/property data
   */
  async parseAppraiserPage(html, input) {
    const errors = [];
    
    try {
      // REAL IMPLEMENTATION: Extract from Broward property appraiser
      // https://web.bcpa.net/bcpaclient/PropertyDetail.aspx
      // Look for:
      // - Owner name
      // - Property address
      // - Mailing address
      // - Homestead status
      
      const ownerMatch = html.match(/<span[^>]*id="[^"]*Owner[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const propertyAddressMatch = html.match(/<span[^>]*id="[^"]*Address[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const mailingAddressMatch = html.match(/<span[^>]*id="[^"]*MailingAddress[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const homesteadMatch = html.match(/Homestead[:\s]*(Yes|No)/i);
      
      const ownerName = ownerMatch ? ownerMatch[1].replace(/<[^>]*>/g, '').trim() : null;
      const propertyAddress = propertyAddressMatch ? propertyAddressMatch[1].replace(/<[^>]*>/g, '').trim() : null;
      const mailingAddress = mailingAddressMatch ? mailingAddressMatch[1].replace(/<[^>]*>/g, '').trim() : null;
      const homestead = homesteadMatch ? homesteadMatch[1].toLowerCase() === 'yes' : null;
      
      if (!ownerName) {
        errors.push('Could not extract owner name from appraiser page');
      }
      
      return {
        ownerName,
        propertyAddress: propertyAddress || input.propertyAddress,
        mailingAddress: mailingAddress || propertyAddress,
        homestead,
        errors,
      };
    } catch (err) {
      return {
        status: 'error',
        errors: [`Parse error: ${err.message}`],
      };
    }
  },
};