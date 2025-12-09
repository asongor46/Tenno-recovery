import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ENHANCED PDF Data Extraction for Return of Sale Lists
 * Extracts surplus cases from sheriff sale PDFs
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, extraction_type, county, state } = await req.json();

    if (!file_url) {
      return Response.json({ 
        status: 'error',
        details: 'file_url required' 
      }, { status: 400 });
    }

    // Use LLM to extract structured data from PDF
    const extractionPrompt = buildExtractionPrompt(extraction_type, county, state);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { 
            type: "string",
            enum: ["return_of_sale", "upcoming_sale", "surplus_list", "unknown"],
            description: "Type of document detected"
          },
          sale_date: { 
            type: "string",
            description: "Sale date if mentioned in document"
          },
          cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                case_number: { type: "string" },
                defendant_name: { type: "string" },
                property_address: { type: "string" },
                county: { type: "string", description: "County name where property is located" },
                state: { type: "string", description: "State abbreviation (e.g., PA, FL)" },
                sale_date: { type: "string", description: "Sale date in YYYY-MM-DD format" },
                judgment_amount: { type: "number" },
                costs: { type: "number" },
                sale_amount: { type: "number" },
                surplus_amount: { type: "number" },
                plaintiff_name: { type: "string" },
                is_corporate_defendant: { type: "boolean" },
                parcel_number: { type: "string" }
              },
              required: ["defendant_name"]
            }
          }
        },
        required: ["document_type", "cases"]
      }
    });

    // Filter and enrich results
    const enrichedCases = result.cases
      .filter(c => !c.is_corporate_defendant) // Remove corporate defendants
      .filter(c => {
        // Calculate surplus if not provided
        if (!c.surplus_amount && c.sale_amount && c.judgment_amount) {
          const costs = c.costs || 0;
          c.surplus_amount = c.sale_amount - c.judgment_amount - costs;
        }
        // Only keep cases with positive surplus
        return c.surplus_amount && c.surplus_amount > 0;
      })
      .map(c => ({
        owner_name: c.defendant_name,
        property_address: c.property_address,
        case_number: c.case_number,
        parcel_number: c.parcel_number,
        surplus_amount: c.surplus_amount,
        sale_amount: c.sale_amount,
        judgment_amount: c.judgment_amount,
        sale_date: c.sale_date || result.sale_date || null,
        county: c.county || county || extractCountyFromAddress(c.property_address),
        state: c.state || state || "PA",
        source_type: "pdf_import",
        is_hot: c.surplus_amount >= 30000,
      }));

    return Response.json({
      status: 'success',
      document_type: result.document_type,
      sale_date: result.sale_date,
      total_found: result.cases.length,
      surplus_cases_found: enrichedCases.length,
      filtered_out: result.cases.length - enrichedCases.length,
      cases: enrichedCases,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function buildExtractionPrompt(extraction_type, county, state) {
  return `You are analyzing a sheriff sale / foreclosure document. This is likely a "Return of Sale" or "Sheriff's Return" document showing properties that have ALREADY been sold at auction.

CRITICAL INSTRUCTIONS:
1. Extract ALL rows from the document that contain sale information
2. For each case/property, extract:
   - Case number (docket number, file number)
   - Defendant name (property owner - this is who we care about)
   - Plaintiff name (usually the bank/lender)
   - Property address (full street address)
   - County name (extract from document header, title, or property address)
   - State (extract from document or property address - use 2-letter abbreviation)
   - Sale date (in YYYY-MM-DD format - look for sale date in header or each row)
   - Judgment Amount / Debt / Upset Price (what was owed)
   - Costs / Fees (sheriff fees, legal costs)
   - Sale Amount / Winning Bid / Amount Realized (what property sold for)
   - Surplus / Overplus / Excess / Balance (if explicitly stated)
   - Parcel number / Tax ID (if available)

3. CORPORATE DEFENDANT DETECTION:
   Mark is_corporate_defendant = true if defendant name contains:
   - "LLC" or "L.L.C."
   - "Inc" or "Incorporated"
   - "Corp" or "Corporation"
   - "LP" or "LLP"
   - "Trust" or "Trustee"
   - "Bank" or "N.A." or "National Association"
   - "Company" or "Co."
   - "Properties" or "Investments" or "Holdings"
   - "Services"
   
   Mark is_corporate_defendant = false for normal human names like:
   - "John M. Doe"
   - "Maria Sanchez"
   - "Robert & Lisa Thompson"
   - "Evelyn J. Brown, et al."

4. SURPLUS CALCULATION:
   - If surplus is explicitly stated in a "Surplus" or "Overplus" column, use that
   - Otherwise, it should be calculated as: Sale Amount - Judgment Amount - Costs
   - Only include cases where surplus > 0

5. DOCUMENT TYPE:
   - "return_of_sale" = properties already sold, showing results
   - "upcoming_sale" = properties scheduled for future sale
   - "surplus_list" = explicit list of surplus funds available

6. LOCATION & DATE EXTRACTION:
   - Look for county name in document header/title (e.g., "Montgomery County Sheriff Sale")
   - Extract county from property addresses if present
   - Look for sale date in header, subtitle, or individual rows
   - Use consistent date format: YYYY-MM-DD

County: ${county || 'Look for county in document'}
State: ${state || 'Look for state in document'}

Extract every row with complete data. Be thorough - every case with positive surplus is valuable.`;
}

function extractCountyFromAddress(address) {
  if (!address) return null;
  const countyMatch = address.match(/,\s*([^,]+)\s+County/i);
  return countyMatch ? countyMatch[1] : null;
}