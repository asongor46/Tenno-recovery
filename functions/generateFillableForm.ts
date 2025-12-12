import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';

/**
 * GENERATE FILLABLE FORM
 * Takes a case and a form template, generates a pre-filled PDF with remaining fields fillable
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id, county_form_template_id } = await req.json();

    if (!case_id || !county_form_template_id) {
      return Response.json({ 
        status: 'error',
        details: 'case_id and county_form_template_id required' 
      }, { status: 400 });
    }

    // Fetch case data
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    // Fetch form template
    const templates = await base44.entities.CountyFormTemplate.filter({ id: county_form_template_id });
    const template = templates[0];
    
    if (!template) {
      return Response.json({ 
        status: 'error',
        details: 'Form template not found' 
      }, { status: 404 });
    }

    // For now, we'll use the LLM to generate a filled version
    // In production, you'd use a PDF library that can actually fill PDF forms
    const filledData = {};
    
    // Map case data to PDF fields using field_mappings
    if (template.field_mappings) {
      for (const [pdfField, caseField] of Object.entries(template.field_mappings)) {
        if (caseData[caseField]) {
          filledData[pdfField] = caseData[caseField];
        }
      }
    }

    // Use LLM to generate a text representation of the filled form
    // This is a temporary solution - ideally you'd use pdf-lib or similar
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a filled version of this form.

Form Name: ${template.form_name}
Form Type: ${template.form_type}

Pre-filled Data (DO NOT change these values, use them as-is):
${JSON.stringify(filledData, null, 2)}

Instructions:
${template.instructions || 'Standard form completion'}

Field Instructions:
${JSON.stringify(template.field_instructions || {}, null, 2)}

Create a clean, professional text representation of this filled form.
Mark any unfilled fields with [TO BE COMPLETED] so the homeowner knows what to fill in.`,
      response_json_schema: {
        type: "object",
        properties: {
          filled_form_text: { type: "string" },
          fields_completed: { type: "array", items: { type: "string" } },
          fields_remaining: { type: "array", items: { type: "string" } },
          completion_percentage: { type: "number" }
        }
      }
    });

    // Create a simple PDF with the filled data
    // Note: This is a basic implementation. For production, use pdf-lib to actually fill PDF forms
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(template.form_name, 20, 20);
    
    doc.setFontSize(10);
    let yPos = 40;
    
    // Add filled fields
    for (const [field, value] of Object.entries(filledData)) {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${field}: ${value}`, 20, yPos);
      yPos += 10;
    }
    
    // Add instructions for remaining fields
    if (result.fields_remaining && result.fields_remaining.length > 0) {
      yPos += 10;
      doc.text("Fields to Complete:", 20, yPos);
      yPos += 10;
      
      result.fields_remaining.forEach(field => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`[ ] ${field}`, 20, yPos);
        yPos += 8;
      });
    }

    // Convert to blob and upload
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `${template.form_name}_filled.pdf`, { type: 'application/pdf' });
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      case_id,
      action: 'Generated Fillable Form',
      description: `Generated pre-filled ${template.form_name} (${result.completion_percentage}% complete)`,
      performed_by: user.email
    });

    return Response.json({
      status: 'success',
      filled_pdf_url: file_url,
      original_template_url: template.file_url,
      fields_completed: result.fields_completed,
      fields_remaining: result.fields_remaining,
      completion_percentage: result.completion_percentage,
      form_name: template.form_name
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});