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
          source_format: {
            type: "string",
            enum: ["sheriff_sale_return", "tax_claim_disbursement", "mixed", "unknown"],
            description: "Detected format of the document"
          },
          form_pages_detected: {
            type: "boolean",
            description: "True if blank form/affidavit pages detected"
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
                surplus_type: { type: "string", enum: ["tax_sale", "sheriff_sale"], description: "tax_sale if from tax deed/tax certificate sale; sheriff_sale if from foreclosure/mortgage default" },
                owner_address: { type: "string", description: "Owner's mailing address if different from property" },
                property_address: { type: "string" },
                county: { type: "string", description: "County name where property is located" },
                state: { type: "string", description: "State abbreviation (e.g., PA, FL)" },
                sale_date: { type: "string", description: "Sale date in YYYY-MM-DD format" },
                judgment_amount: { type: "number" },
                costs: { type: "number" },
                sale_amount: { type: "number" },
                surplus_amount: { type: "number" },
                plaintiff_name: { type: "string" },
                interested_parties: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Other interested parties (junior lienholders, heirs, etc.)"
                },
                is_corporate_defendant: { type: "boolean" },
                parcel_number: { type: "string" },
                has_check_number: { type: "boolean", description: "True if check number found (funds may be disbursed)" }
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
        // Keep cases with positive surplus OR cases from tax sales with null surplus (needs verification)
        return (c.surplus_amount && c.surplus_amount > 0) || (c.surplus_type === "tax_sale" && !c.surplus_amount);
      })
      .map(c => {
        // Calculate surplus if not provided
        if (!c.surplus_amount && c.sale_amount && c.judgment_amount) {
          const costs = c.costs || 0;
          c.surplus_amount = c.sale_amount - c.judgment_amount - costs;
        }
        
        const caseRecord = {
          owner_name: c.defendant_name,
          owner_address: c.owner_address || c.property_address,
          property_address: c.property_address,
          case_number: c.case_number,
          parcel_number: c.parcel_number,
          surplus_amount: c.surplus_amount || null,
          sale_amount: c.sale_amount,
          judgment_amount: c.judgment_amount,
          sale_date: c.sale_date || result.sale_date || null,
          county: c.county || county || extractCountyFromAddress(c.property_address),
          state: c.state || state || "PA",
          surplus_type: c.surplus_type || "sheriff_sale",
          source_type: "pdf_import",
          is_hot: c.surplus_amount >= 30000,
          internal_notes: `Plaintiff: ${c.plaintiff_name || 'Unknown'}\nInterested Parties: ${c.interested_parties?.join(', ') || 'None'}`,
        };
        
        // Flag for verification if surplus is null but from tax sale
        if (!c.surplus_amount && c.surplus_type === "tax_sale") {
          caseRecord.internal_notes = `${caseRecord.internal_notes}\nNEEDS SURPLUS VERIFICATION: Amount not shown on list`;
        }
        
        return caseRecord;
      });

    // Auto-add new counties to directory
    const uniqueCounties = [...new Set(enrichedCases.map(c => c.county).filter(Boolean))];
    for (const countyName of uniqueCounties) {
      const existingCounties = await base44.asServiceRole.entities.County.filter({ 
        name: countyName,
        state: enrichedCases.find(c => c.county === countyName)?.state || state || "PA"
      });
      
      if (existingCounties.length === 0) {
        await base44.asServiceRole.entities.County.create({
          name: countyName,
          state: enrichedCases.find(c => c.county === countyName)?.state || state || "PA",
          special_notes: "Auto-created from PDF import"
        });
      }
    }

    return Response.json({
      status: 'success',
      document_type: result.document_type,
      source_format: result.source_format || "unknown",
      form_pages_detected: result.form_pages_detected || false,
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
  return `You are analyzing a surplus / foreclosure document. This could be a sheriff sale "Return of Sale", a tax sale surplus list, or any document listing properties sold at auction with excess proceeds owed to prior owners.

DOCUMENT FORMAT DETECTION:
First, identify the document format:

FORMAT A — SHERIFF SALE / RETURN OF SALE:
Contains case/docket numbers, defendant names, judgment amounts, 
sale amounts, property addresses, plaintiff names.
Keywords: Sheriff, Foreclosure, Return of Sale, Mortgage, Judgment.
→ Set surplus_type: sheriff_sale for all cases.
→ Set source_format: "sheriff_sale_return"

FORMAT B — TAX CLAIM BUREAU / TAX SALE SURPLUS:
Contains parcel numbers, sale years, sale types (Upset Sale, 
Judicial Sale, Continued Sale), payee names, possibly check numbers.
Keywords: Tax Claim Bureau, Upset Sale, Judicial Sale, Tax Sale, 
Disbursement, Tax Collector, Delinquent Tax, Sale Disbursement Check.
→ Set surplus_type: tax_sale for all cases.
→ Map payee_name to defendant_name (owner name field).
→ Map parcel to parcel_number.
→ Surplus amount may NOT be present — set to null if not shown.
→ If a check number is present, mark has_check_number: true (funds may be disbursed).
→ Set source_format: "tax_claim_disbursement"

FORMAT C — MIXED (claim forms + data pages):
Some PDFs contain both form templates (affidavit pages with blank 
lines and signature blocks) AND data pages (surplus lists).
→ Extract cases from the data pages only.
→ Set form_pages_detected: true
→ Set source_format: "mixed"

FORMAT UNKNOWN:
If you cannot determine the format, set source_format: "unknown" and do your best to extract data.

CRITICAL INSTRUCTIONS:
1. Extract ALL rows from the document that contain sale information
2. For each case/property, extract ALL 15 REQUIRED FIELDS:
   - Case number (docket number, file number, or parcel if no case number)
   - Defendant name (property owner - this is who we care about. For tax sales, this is the payee name)
   - Owner address (mailing address if different from property, often in parentheses)
   - Property address (full street address where property is located)
   - County name (extract from document header, title, or property address)
   - State (extract from document or property address - use 2-letter abbreviation)
   - Sale date (in YYYY-MM-DD format - look for sale date in header or each row)
   - Judgment Amount / Debt / Upset Price (what was owed - may be null for tax sales)
   - Costs / Fees (sheriff fees, legal costs)
   - Sale Amount / Winning Bid / Amount Realized (what property sold for)
   - Surplus / Overplus / Excess / Balance (if explicitly stated - may be null for tax sale lists)
   - Plaintiff name (usually the bank/lender - may be null for tax sales)
   - Interested parties (other lienholders, heirs, co-owners - extract all named)
   - Parcel number / Tax ID (if available)
   - has_check_number (boolean) - true if check number found in that row

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
   - For tax sale lists where no surplus amount is shown, set to null
   - Only include cases where surplus > 0 OR surplus is null (for verification)

5. DOCUMENT TYPE & SURPLUS TYPE:
   - "return_of_sale" = sheriff/foreclosure sale results (surplus_type = sheriff_sale)
   - "upcoming_sale" = properties scheduled for future auction
   - "surplus_list" = explicit list of surplus funds (could be tax_sale or sheriff_sale — look for keywords like "tax deed", "tax certificate", "tax lien" for tax_sale; "foreclosure", "mortgage", "judgment" for sheriff_sale)
   - "unknown" = cannot determine
   Per-case surplus_type: detect from document keywords. "tax sale", "tax deed", "delinquent taxes" → tax_sale. "foreclosure", "sheriff", "mortgage" → sheriff_sale.

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