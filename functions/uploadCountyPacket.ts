import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * COUNTY PACKET UPLOADER
 * Parses uploaded county form packets and stores as templates
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

    // Use LLM to analyze the packet and extract forms
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing a county surplus fund claim packet PDF.

Extract all individual forms from this packet and identify:

1. Form type (application, affidavit_of_mailing, civil_cover_sheet, order_to_release, instructions, checklist)
2. Form name
3. Merge fields needed (owner_name, property_address, case_number, surplus_amount, sale_date, etc.)
4. Signature locations (owner, notary, judge, clerk)
5. Whether notarization is required
6. Special instructions

PDF URL: ${file_url}

Return a structured list of all forms in this packet.`,
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
                merge_fields: { type: "array", items: { type: "string" } },
                signature_locations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      label: { type: "string" }
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

    // Create form templates
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
        signature_locations: form.signature_locations || [],
        requires_notary: form.requires_notary || false,
        order: i + 1,
        instructions: form.instructions,
        is_active: true
      });

      createdForms.push(template);
    }

    // Update county with form set info
    await base44.asServiceRole.entities.County.update(county_id, {
      special_notes: (await base44.entities.County.filter({ id: county_id }))[0]?.special_notes + 
        `\n\nForm Set: ${form_set_name || analysis.form_set_name} uploaded with ${createdForms.length} forms.`
    });

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