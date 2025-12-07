import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PDF Extraction Engine
 * Processes uploaded PDFs to extract structured data for:
 * - Case Builder (surplus lists)
 * - County Rules (instruction documents)
 * - Identity/People Finder (deeds, tax bills, notices)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id } = await req.json();

    // Get document
    const docs = await base44.entities.Document.filter({ id: document_id });
    const document = docs[0];

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Step 1: Detect document type
    const docType = detectDocumentType(document);
    
    // Step 2: Set usability flags
    const usabilityFlags = {
      usable_for_case_builder: docType === 'surplus_list',
      usable_for_county_rules: docType === 'instruction',
      usable_for_identity: ['deed', 'tax_bill', 'notice', 'claim_packet'].includes(docType),
    };

    // Step 3: Extract data based on type
    let extractedData = {};
    let casesCreated = 0;
    let countyUpdated = false;

    if (docType === 'surplus_list') {
      // Extract surplus list rows
      const result = await extractSurplusList(base44, document);
      extractedData = result.data;
      casesCreated = result.casesCreated;
    } else if (docType === 'instruction') {
      // Extract county rules
      const result = await extractCountyRules(base44, document);
      extractedData = result.data;
      countyUpdated = result.updated;
    } else if (usabilityFlags.usable_for_identity) {
      // Extract identity data
      extractedData = await extractIdentityData(base44, document);
    }

    // Update document with results
    await base44.asServiceRole.entities.Document.update(document_id, {
      ...usabilityFlags,
      extraction_status: 'completed',
      extracted_data: extractedData,
      metadata: {
        ...document.metadata,
        doc_type: docType,
        extracted_at: new Date().toISOString(),
      },
    });

    return Response.json({
      status: 'success',
      doc_type: docType,
      extracted_data: extractedData,
      cases_created: casesCreated,
      county_updated: countyUpdated,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Detect document type from filename and content
 */
function detectDocumentType(document) {
  const name = document.name?.toLowerCase() || '';
  
  if (name.includes('surplus') && (name.includes('list') || name.includes('schedule'))) {
    return 'surplus_list';
  }
  if (name.includes('instruction') || name.includes('procedure') || name.includes('guide')) {
    return 'instruction';
  }
  if (name.includes('deed')) {
    return 'deed';
  }
  if (name.includes('tax') && (name.includes('bill') || name.includes('notice'))) {
    return 'tax_bill';
  }
  if (name.includes('notice')) {
    return 'notice';
  }
  if (name.includes('notary')) {
    return 'notary_page';
  }
  
  return 'other';
}

/**
 * Extract surplus list data and create cases
 */
async function extractSurplusList(base44, document) {
  // Use Base44 LLM integration to extract structured data
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract all surplus case rows from this PDF. For each row, extract:
- Owner name
- Property address
- Case number
- Parcel number (if present)
- Surplus amount (in dollars)
- Sale amount (if present)
- Judgment amount (if present)
- Sale date (if present)

Return a JSON array of cases.`,
    file_urls: document.file_url,
    response_json_schema: {
      type: 'object',
      properties: {
        cases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              owner_name: { type: 'string' },
              property_address: { type: 'string' },
              case_number: { type: 'string' },
              parcel_number: { type: 'string' },
              surplus_amount: { type: 'number' },
              sale_amount: { type: 'number' },
              judgment_amount: { type: 'number' },
              sale_date: { type: 'string' },
            },
          },
        },
      },
    },
  });

  const cases = result.cases || [];
  let casesCreated = 0;

  // Create cases from extracted data
  for (const caseData of cases) {
    if (caseData.owner_name && caseData.surplus_amount) {
      // Check if case already exists
      const existing = await base44.asServiceRole.entities.Case.filter({
        case_number: caseData.case_number,
      });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.Case.create({
          owner_name: caseData.owner_name,
          property_address: caseData.property_address,
          case_number: caseData.case_number,
          parcel_number: caseData.parcel_number,
          surplus_amount: caseData.surplus_amount,
          sale_amount: caseData.sale_amount,
          judgment_amount: caseData.judgment_amount,
          sale_date: caseData.sale_date,
          source_type: 'pdf_import',
          status: 'active',
          stage: 'imported',
          is_hot: caseData.surplus_amount >= 30000,
          // Set county from document if available
          county: document.county_id ? (await getCountyName(base44, document.county_id)) : '',
        });
        casesCreated++;
      }
    }
  }

  return { data: { cases }, casesCreated };
}

/**
 * Extract county rules from instruction PDFs
 */
async function extractCountyRules(base44, document) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract county filing rules from this document:
- County name and state
- Clerk contact information (name, email, phone)
- Filing address
- Website URLs (surplus info, e-file portal)
- Whether representatives are allowed to file
- Whether assignment documents are required
- Whether notarization is required
- Type of notary accepted (wet ink, RON, or either)
- Filing methods (mail, e-file, in-person)
- Claim deadline in days from sale date
- Processing timeline estimate
- Any special notes or restrictions`,
    file_urls: document.file_url,
    response_json_schema: {
      type: 'object',
      properties: {
        county_name: { type: 'string' },
        state: { type: 'string' },
        clerk_name: { type: 'string' },
        clerk_email: { type: 'string' },
        clerk_phone: { type: 'string' },
        filing_address: { type: 'string' },
        surplus_website: { type: 'string' },
        efile_portal: { type: 'string' },
        rep_allowed: { type: 'boolean' },
        assignment_required: { type: 'boolean' },
        notary_required: { type: 'boolean' },
        notary_type: { type: 'string', enum: ['wet', 'ron', 'either'] },
        filing_method: { type: 'string', enum: ['mail', 'efile', 'in_person'] },
        claim_deadline_days: { type: 'number' },
        processing_timeline: { type: 'string' },
        special_notes: { type: 'string' },
      },
    },
  });

  let updated = false;

  if (result.county_name && result.state) {
    // Find or create county
    const existing = await base44.asServiceRole.entities.County.filter({
      name: result.county_name,
      state: result.state,
    });

    if (existing.length > 0) {
      // Update existing county
      await base44.asServiceRole.entities.County.update(existing[0].id, {
        ...result,
        rules_last_updated_at: new Date().toISOString(),
        rules_source_document_id: document.id,
      });
      updated = true;
    } else {
      // Create new county
      await base44.asServiceRole.entities.County.create({
        name: result.county_name,
        state: result.state,
        ...result,
        rules_last_updated_at: new Date().toISOString(),
        rules_source_document_id: document.id,
      });
      updated = true;
    }
  }

  return { data: result, updated };
}

/**
 * Extract identity data from deeds, tax bills, notices
 */
async function extractIdentityData(base44, document) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract owner identity information from this document:
- Owner full name(s)
- Mailing address
- Property address
- Phone number(s)
- Email address(es)
- Any mentions of "Estate of", "Executor", or deceased indicators
- Co-owner names if present`,
    file_urls: document.file_url,
    response_json_schema: {
      type: 'object',
      properties: {
        owner_name: { type: 'string' },
        co_owners: { type: 'array', items: { type: 'string' } },
        mailing_address: { type: 'string' },
        property_address: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        deceased_indicator: { type: 'boolean' },
        executor_name: { type: 'string' },
      },
    },
  });

  return result;
}

/**
 * Helper to get county name by ID
 */
async function getCountyName(base44, countyId) {
  const counties = await base44.asServiceRole.entities.County.filter({ id: countyId });
  return counties[0]?.name || '';
}

/**
 * Calculate name similarity (simple version)
 */
function calculateNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  
  const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  
  return 0;
}

/**
 * Calculate address similarity (simple version)
 */
function calculateAddressSimilarity(addr1, addr2) {
  if (!addr1 || !addr2) return 0;
  
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const a1 = normalize(addr1);
  const a2 = normalize(addr2);
  
  if (a1 === a2) return 1.0;
  if (a1.includes(a2) || a2.includes(a1)) return 0.7;
  
  return 0;
}