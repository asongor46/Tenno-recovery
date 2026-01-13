import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, county_hint, state_hint } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Deep form analysis with AI
    const formAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this legal form for a surplus funds recovery system.

Extract ALL of the following:

1. FORM IDENTITY:
   - Official form name (exactly as printed)
   - Form number/code if visible
   - County and state
   - Version date if shown

2. FORM TYPE - Classify as:
   - claim_form (main surplus claim)
   - affidavit (sworn statement)
   - assignment (transfer of rights)
   - cover_sheet (filing cover page)
   - w9 (tax form)
   - id_verification (identity proof form)
   - heir_affidavit (for deceased owners)
   - other

3. FILLABLE FIELDS - List every blank line, box, or field:
   - Field purpose (what info goes there)
   - Field type (text, date, signature, checkbox, dollar amount)
   - Which case data field it maps to
   - Is it required?
   - Page number

4. NOTARY REQUIREMENTS:
   - Is there a notary section? Where?
   - Type: acknowledgment, jurat, or other
   - State-specific language?

5. WITNESS REQUIREMENTS:
   - Are witness signatures required?
   - How many?

6. SPECIAL INSTRUCTIONS:
   - Any instructions printed on the form
   - Filing deadlines mentioned
   - Attachments required

Be exhaustive - this will be used to auto-fill the form.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          form_name: { type: "string" },
          form_code: { type: "string" },
          county: { type: "string" },
          state: { type: "string" },
          form_type: { type: "string" },
          version_date: { type: "string" },
          page_count: { type: "number" },
          is_fillable_pdf: { type: "boolean" },
          
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field_label: { type: "string" },
                field_type: { type: "string" },
                maps_to: { type: "string" },
                is_required: { type: "boolean" },
                page_number: { type: "number" },
                instructions: { type: "string" }
              }
            }
          },
          
          notary_required: { type: "boolean" },
          notary_sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                page_number: { type: "number" },
                notary_type: { type: "string" },
                state_specific: { type: "string" }
              }
            }
          },
          
          witness_required: { type: "boolean" },
          witness_count: { type: "number" },
          
          instructions_on_form: { type: "array", items: { type: "string" } },
          attachments_required: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Check if form already exists
    const existingForms = await base44.asServiceRole.entities.FormLibrary.filter({
      county_name: formAnalysis.county || county_hint,
      form_type: formAnalysis.form_type
    });

    const matchingForm = existingForms.find(f => 
      f.form_name === formAnalysis.form_name || 
      (formAnalysis.form_code && f.form_code === formAnalysis.form_code)
    );

    let formRecord;
    if (matchingForm) {
      // Update existing form
      formRecord = await base44.asServiceRole.entities.FormLibrary.update(matchingForm.id, {
        blank_template_url: file_url,
        form_version: formAnalysis.version_date,
        detected_fields: mapFieldsToSchema(formAnalysis.fields),
        notary_sections: formAnalysis.notary_sections || [],
        requires_notary: formAnalysis.notary_required || false,
        requires_witness: formAnalysis.witness_required || false,
        witness_count: formAnalysis.witness_count,
        page_count: formAnalysis.page_count,
        is_fillable_pdf: formAnalysis.is_fillable_pdf || false,
        instructions_on_form: formAnalysis.instructions_on_form || [],
        attachments_required: formAnalysis.attachments_required || []
      });
    } else {
      // Create new form
      formRecord = await base44.asServiceRole.entities.FormLibrary.create({
        county_name: formAnalysis.county || county_hint || 'Unknown',
        state: formAnalysis.state || state_hint,
        form_name: formAnalysis.form_name || 'Untitled Form',
        form_code: formAnalysis.form_code,
        form_type: formAnalysis.form_type || 'other',
        form_version: formAnalysis.version_date,
        blank_template_url: file_url,
        detected_fields: mapFieldsToSchema(formAnalysis.fields),
        notary_sections: formAnalysis.notary_sections || [],
        requires_notary: formAnalysis.notary_required || false,
        requires_witness: formAnalysis.witness_required || false,
        witness_count: formAnalysis.witness_count,
        page_count: formAnalysis.page_count,
        is_fillable_pdf: formAnalysis.is_fillable_pdf || false,
        instructions_on_form: formAnalysis.instructions_on_form || [],
        attachments_required: formAnalysis.attachments_required || [],
        times_used: 0
      });
    }

    return Response.json({
      success: true,
      form_id: formRecord.id,
      is_new: !matchingForm,
      form_analysis: formAnalysis,
      auto_fill_ready: formAnalysis.is_fillable_pdf && formAnalysis.fields?.length > 0,
      field_count: formAnalysis.fields?.length || 0
    });

  } catch (error) {
    console.error('Form analysis error:', error);
    return Response.json({ 
      error: 'Form analysis failed', 
      details: error.message 
    }, { status: 500 });
  }
});

function mapFieldsToSchema(fields) {
  if (!fields || !Array.isArray(fields)) return [];
  
  const caseFieldMappings = {
    'claimant name': 'owner_name',
    'owner name': 'owner_name',
    'property owner': 'owner_name',
    'former owner': 'owner_name',
    'claimant address': 'owner_address',
    'mailing address': 'owner_address',
    'property address': 'property_address',
    'subject property': 'property_address',
    'parcel': 'parcel_number',
    'parcel id': 'parcel_number',
    'folio': 'parcel_number',
    'surplus amount': 'surplus_amount',
    'claim amount': 'surplus_amount',
    'sale date': 'sale_date',
    'auction date': 'sale_date',
    'county': 'county',
    'case number': 'case_number'
  };
  
  return fields.map(field => ({
    pdf_field_name: field.field_label,
    field_type: field.field_type,
    maps_to_case_field: findBestMapping(field.field_label, caseFieldMappings),
    page_number: field.page_number,
    is_required: field.is_required || false,
    auto_fillable: field.field_type !== 'signature' && field.field_type !== 'notary'
  }));
}

function findBestMapping(fieldLabel, mappings) {
  if (!fieldLabel) return null;
  
  const normalized = fieldLabel.toLowerCase().trim();
  
  for (const [pattern, mapping] of Object.entries(mappings)) {
    if (normalized.includes(pattern)) {
      return mapping;
    }
  }
  
  return null;
}