import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FILLED PACKET GENERATOR
 * Auto-fills county forms with case data
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

    if (!case_id) {
      return Response.json({ 
        status: 'error',
        details: 'case_id required' 
      }, { status: 400 });
    }

    // Fetch case
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    // Find county
    const counties = await base44.entities.County.filter({ 
      name: caseData.county,
      state: caseData.state
    });
    const county = counties[0];

    if (!county) {
      return Response.json({ 
        status: 'error',
        details: 'County not found' 
      }, { status: 404 });
    }

    // Fetch form templates
    const forms = await base44.entities.CountyFormTemplate.filter({ 
      county_id: county.id,
      is_active: true
    }, 'order');

    if (forms.length === 0) {
      return Response.json({ 
        status: 'error',
        details: 'No form templates found for this county' 
      }, { status: 404 });
    }

    // Prepare merge data
    const mergeData = {
      owner_name: caseData.owner_name,
      property_address: caseData.property_address,
      parcel_number: caseData.parcel_number,
      case_number: caseData.case_number,
      surplus_amount: caseData.surplus_amount,
      sale_date: caseData.sale_date,
      sale_amount: caseData.sale_amount,
      judgment_amount: caseData.judgment_amount,
      county: caseData.county,
      state: caseData.state,
      owner_email: caseData.owner_email,
      owner_phone: caseData.owner_phone,
      owner_address: caseData.owner_address,
      today_date: new Date().toLocaleDateString(),
    };

    // Generate fillable forms using the new system
    const filledForms = [];
    for (const form of forms) {
      // Use the generateFillableForm function for each form
      const { data: filledFormData } = await base44.functions.invoke('generateFillableForm', {
        case_id,
        county_form_template_id: form.id
      });

      filledForms.push({
        form_id: form.form_id,
        form_name: form.form_name,
        form_type: form.form_type,
        filled_pdf_url: filledFormData.filled_pdf_url,
        original_template_url: filledFormData.original_template_url,
        fields_completed: filledFormData.fields_completed,
        fields_remaining: filledFormData.fields_remaining,
        completion_percentage: filledFormData.completion_percentage,
        requires_notary: form.requires_notary,
        signature_locations: form.signature_locations,
        instructions: form.instructions
      });

      // Create document record for the filled form
      await base44.asServiceRole.entities.Document.create({
        case_id,
        name: `${form.form_name} (Pre-filled)`,
        category: form.form_type,
        tags: ['auto_filled', 'county_form'],
        file_url: filledFormData.filled_pdf_url,
        order: form.order,
        metadata: {
          filled: true,
          template_id: form.id,
          completion_percentage: filledFormData.completion_percentage,
          fields_completed: filledFormData.fields_completed,
          fields_remaining: filledFormData.fields_remaining
        }
      });
    }

    // Log activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'packet_generated',
      description: `Generated ${filledForms.length} county forms for ${county.name}`,
      performed_by: user.email,
      metadata: { forms_count: filledForms.length }
    });

    return Response.json({
      status: 'success',
      county: county.name,
      forms_generated: filledForms.length,
      forms: filledForms,
      instructions: county.special_notes
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});