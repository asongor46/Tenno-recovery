import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * COUNTY PACKET UPLOADER - ENHANCED WITH SMART FIELD MAPPING
 * Parses uploaded county form packets and stores as templates with precise field mappings
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, county_id, form_set_name } = await req.json();

    if (!file_url || !county_id) {
      return Response.json({ 
        status: 'error',
        details: 'file_url and county_id required' 
      }, { status: 400 });
    }

    // Enhanced LLM analysis with detailed field mapping
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert at analyzing legal surplus fund claim forms. Analyze this PDF packet and extract detailed information about each form.

For EACH form in the packet, extract:

1. **Form Identification:**
   - form_id: unique identifier (e.g., "cvep11f", "application")
   - form_name: full display name
   - form_type: one of [application, affidavit, cover_sheet, order, instructions, checklist, other]

2. **Field Mappings (CRITICAL):**
   For every fillable field in the PDF, map the PDF field name to the corresponding Case entity field.
   Case entity fields available: owner_name, owner_email, owner_phone, owner_address, property_address, county, state, parcel_number, surplus_amount, sale_date, sale_amount, judgment_amount, case_number
   
   Example: If PDF has "Owner's Full Legal Name", map it to "owner_name"
   Example: If PDF has "Property Address (Street, City, State, Zip)", map it to "property_address"
   Example: If PDF has "Excess Proceeds Amount", map it to "surplus_amount"
   
   Return as: {"PDF Field Name": "case_entity_field"}

3. **Validation Rules:**
   For each field, specify any validation rules:
   - Date fields: format (e.g., "MM/DD/YYYY")
   - Numeric fields: constraints
   - Text fields: max length, required, etc.

4. **Field Instructions:**
   Extract any specific instructions for individual fields from the form itself.

5. **Signature Locations:**
   Identify all signature fields with: type (owner, notary, judge, clerk), label, required

6. **Dynamic/Repeatable Sections:**
   Identify any sections that might repeat (e.g., multiple properties, multiple plaintiffs)

7. **Notary Requirements:**
   Does this form require notarization?

8. **Overall Instructions:**
   Any general instructions for completing this form

PDF URL: ${file_url}

Be thorough and precise with field mappings - this is critical for auto-filling forms.`,
      response_json_schema: {
        type: "object",
        properties: {
          county_detected: { type: "string" },
          state_detected: { type: "string" },
          form_set_name: { type: "string" },
          forms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                form_id: { type: "string" },
                form_name: { type: "string" },
                form_type: { type: "string" },
                field_mappings: {
                  type: "object",
                  description: "Maps PDF field names to Case entity fields"
                },
                validation_rules: {
                  type: "object",
                  description: "Validation rules per field"
                },
                field_instructions: {
                  type: "object",
                  description: "Instructions per field"
                },
                merge_fields: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "List of all fillable fields found"
                },
                signature_locations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      label: { type: "string" },
                      required: { type: "boolean" }
                    }
                  }
                },
                dynamic_sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section_name: { type: "string" },
                      repeatable: { type: "boolean" },
                      fields: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                requires_notary: { type: "boolean" },
                instructions: { type: "string" }
              }
            }
          }
        }
      },
      file_urls: [file_url]
    });

    // Create enhanced form templates with field mappings
    const createdForms = [];
    for (let i = 0; i < analysis.forms.length; i++) {
      const form = analysis.forms[i];
      
      const template = await base44.asServiceRole.entities.CountyFormTemplate.create({
        county_id,
        form_set_name: form_set_name || analysis.form_set_name || "Standard",
        form_id: form.form_id,
        form_name: form.form_name,
        form_type: form.form_type || "other",
        file_url,
        is_fillable: true,
        merge_fields: form.merge_fields || [],
        field_mappings: form.field_mappings || {},
        validation_rules: form.validation_rules || {},
        field_instructions: form.field_instructions || {},
        dynamic_sections: form.dynamic_sections || [],
        signature_locations: form.signature_locations || [],
        requires_notary: form.requires_notary || false,
        order: i + 1,
        instructions: form.instructions,
        is_active: true
      });

      createdForms.push(template);
    }

    // Update county with form set info
    const county = await base44.entities.County.filter({ id: county_id });
    if (county[0]) {
      await base44.asServiceRole.entities.County.update(county_id, {
        special_notes: (county[0].special_notes || "") + 
          `\n\nForm Set: ${form_set_name || analysis.form_set_name} uploaded with ${createdForms.length} forms on ${new Date().toLocaleDateString()}.`
      });
    }

    return Response.json({
      status: 'success',
      forms_created: createdForms.length,
      forms: createdForms,
      detected_county: analysis.county_detected,
      detected_state: analysis.state_detected
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});