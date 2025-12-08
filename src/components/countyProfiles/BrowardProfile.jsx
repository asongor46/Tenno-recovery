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
      // ENHANCED: Parse Broward HTML table or structured data
      // Handles broward.deedauction.net or similar county auction sites
      
      if (typeof content === 'string') {
        // Try multiple parsing strategies
        
        // Strategy 1: Standard HTML table with class selectors
        let rows = content.match(/<tr[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/tr>/gi);
        if (!rows || rows.length === 0) {
          // Strategy 2: Any table rows
          rows = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        }
        
        for (const row of rows.slice(1)) { // Skip header
          try {
            const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
            
            if (cells.length >= 3) {
              // Extract cell contents (strip HTML tags)
              const extractText = (cell) => cell?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
              
              const caseNumber = extractText(cells[0]);
              const parcelNumber = extractText(cells[1]);
              const propertyAddress = extractText(cells[2]);
              const surplusText = cells[3] ? extractText(cells[3]) : null;
              const ownerName = cells[4] ? extractText(cells[4]) : null;
              const saleDate = cells[5] ? extractText(cells[5]) : null;
              
              // Parse surplus amount (handle various formats)
              let surplusAmount = null;
              if (surplusText) {
                const cleaned = surplusText.replace(/[$,\s]/g, '');
                surplusAmount = parseFloat(cleaned);
              }
              
              // Only add if we have minimum required data
              if (caseNumber || parcelNumber) {
                cases.push({
                  caseNumber: caseNumber || `BR-${Date.now()}`,
                  parcelNumber,
                  propertyAddress,
                  surplusAmount: !isNaN(surplusAmount) ? surplusAmount : null,
                  ownerName,
                  saleDate,
                  county: 'Broward',
                  state: 'FL',
                  source: 'broward_surplus_scrape',
                });
              }
            }
          } catch (err) {
            errors.push(`Row parse failed: ${err.message}`);
          }
        }
        
        if (cases.length === 0 && rows.length > 0) {
          errors.push('HTML structure detected but no data extracted - may need profile update');
        }
      } else {
        return {
          status: 'unimplemented',
          cases: [],
          errors: ['PDF parsing not yet implemented for Broward - please use HTML/URL'],
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
      // ENHANCED: Multiple extraction strategies for Broward sale pages
      // Handles various page layouts and field names
      
      // Extract numeric value from text (handles $, commas, etc.)
      const extractAmount = (text) => {
        if (!text) return null;
        const cleaned = text.replace(/[$,\s]/g, '');
        const value = parseFloat(cleaned);
        return isNaN(value) ? null : value;
      };
      
      // Try multiple patterns for each field
      const patterns = {
        openingBid: [
          /Opening Bid[:\s]*\$?([\d,]+\.?\d*)/i,
          /Starting Bid[:\s]*\$?([\d,]+\.?\d*)/i,
          /Minimum Bid[:\s]*\$?([\d,]+\.?\d*)/i,
        ],
        winningBid: [
          /Winning Bid[:\s]*\$?([\d,]+\.?\d*)/i,
          /Final Bid[:\s]*\$?([\d,]+\.?\d*)/i,
          /Sale Price[:\s]*\$?([\d,]+\.?\d*)/i,
          /Purchase Price[:\s]*\$?([\d,]+\.?\d*)/i,
        ],
        taxes: [
          /Taxes Owed[:\s]*\$?([\d,]+\.?\d*)/i,
          /Tax Amount[:\s]*\$?([\d,]+\.?\d*)/i,
          /Delinquent Taxes[:\s]*\$?([\d,]+\.?\d*)/i,
        ],
        fees: [
          /Fees[:\s]*\$?([\d,]+\.?\d*)/i,
          /Total Fees[:\s]*\$?([\d,]+\.?\d*)/i,
          /Costs[:\s]*\$?([\d,]+\.?\d*)/i,
        ],
        surplus: [
          /Surplus[:\s]*\$?([\d,]+\.?\d*)/i,
          /Excess Proceeds[:\s]*\$?([\d,]+\.?\d*)/i,
        ],
      };
      
      // Try to extract each field
      let openingBid = null;
      let winningBid = null;
      let taxesOwed = null;
      let fees = null;
      let surplusAmount = null;
      
      for (const pattern of patterns.openingBid) {
        const match = html.match(pattern);
        if (match) {
          openingBid = extractAmount(match[1]);
          break;
        }
      }
      
      for (const pattern of patterns.winningBid) {
        const match = html.match(pattern);
        if (match) {
          winningBid = extractAmount(match[1]);
          break;
        }
      }
      
      for (const pattern of patterns.taxes) {
        const match = html.match(pattern);
        if (match) {
          taxesOwed = extractAmount(match[1]);
          break;
        }
      }
      
      for (const pattern of patterns.fees) {
        const match = html.match(pattern);
        if (match) {
          fees = extractAmount(match[1]);
          break;
        }
      }
      
      // Try to extract surplus directly first
      for (const pattern of patterns.surplus) {
        const match = html.match(pattern);
        if (match) {
          surplusAmount = extractAmount(match[1]);
          break;
        }
      }
      
      // Calculate surplus if not found directly
      if (surplusAmount === null && winningBid != null && taxesOwed != null && fees != null) {
        surplusAmount = winningBid - taxesOwed - fees;
      }
      
      // Validation warnings
      if (openingBid === null && winningBid === null) {
        errors.push('Could not extract any bid amounts from page');
      }
      if (surplusAmount === null) {
        errors.push('Could not calculate or extract surplus amount');
      }
      if (surplusAmount != null && surplusAmount < 0) {
        errors.push('Calculated surplus is negative - data may be incomplete');
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
      // ENHANCED: Multiple strategies for Broward property appraiser extraction
      // Handles bcpa.net and similar appraiser sites
      
      const cleanText = (text) => text?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      
      // Strategy 1: Look for labeled spans/divs by ID
      let ownerName = null;
      let propertyAddress = null;
      let mailingAddress = null;
      let homestead = null;
      
      // Try multiple owner field patterns
      const ownerPatterns = [
        /<span[^>]*id="[^"]*Owner[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
        /<div[^>]*class="[^"]*owner[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /Owner[:\s]*<[^>]*>([\s\S]*?)<\//i,
        /Legal Owner[:\s]*([^\n<]+)/i,
      ];
      
      for (const pattern of ownerPatterns) {
        const match = html.match(pattern);
        if (match) {
          ownerName = cleanText(match[1]);
          if (ownerName && ownerName.length > 2) break;
        }
      }
      
      // Try multiple address patterns
      const addressPatterns = [
        /<span[^>]*id="[^"]*(?:Situs|Property)?Address[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
        /Property Address[:\s]*([^\n<]+)/i,
        /Situs Address[:\s]*([^\n<]+)/i,
      ];
      
      for (const pattern of addressPatterns) {
        const match = html.match(pattern);
        if (match) {
          propertyAddress = cleanText(match[1]);
          if (propertyAddress && propertyAddress.length > 5) break;
        }
      }
      
      // Try mailing address patterns
      const mailingPatterns = [
        /<span[^>]*id="[^"]*Mailing[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
        /Mailing Address[:\s]*([^\n<]+(?:\n[^\n<]+){0,2})/i,
      ];
      
      for (const pattern of mailingPatterns) {
        const match = html.match(pattern);
        if (match) {
          mailingAddress = cleanText(match[1]);
          if (mailingAddress && mailingAddress.length > 5) break;
        }
      }
      
      // Homestead detection
      const homesteadPatterns = [
        /Homestead[:\s]*(Yes|No|Y|N)/i,
        /Homestead Exemption[:\s]*(Yes|No|Y|N|Approved|Denied)/i,
      ];
      
      for (const pattern of homesteadPatterns) {
        const match = html.match(pattern);
        if (match) {
          const val = match[1].toLowerCase();
          homestead = val === 'yes' || val === 'y' || val === 'approved';
          break;
        }
      }
      
      // Validation
      if (!ownerName || ownerName.length < 3) {
        errors.push('Could not extract valid owner name from appraiser page');
      }
      if (!propertyAddress) {
        errors.push('Could not extract property address');
      }
      
      // Use property address as fallback for mailing
      if (!mailingAddress && propertyAddress) {
        mailingAddress = propertyAddress;
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