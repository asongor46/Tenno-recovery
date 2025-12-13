import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DOCUMENT CLEANUP ON CASE CLOSURE
 * Enforces retention policies when case is closed
 * 
 * Sensitive docs (IDs, bank docs) → archive or delete
 * Legal/financial docs retained:
 * - agreement
 * - authorization
 * - filing proof
 * - invoices
 * - payment confirmation
 * - audit logs
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

    // Verify case is closed
    if (caseData.stage !== 'closed') {
      return Response.json({ 
        status: 'error',
        details: 'Case must be closed before cleanup' 
      }, { status: 400 });
    }

    // Fetch all documents for case
    const documents = await base44.entities.Document.filter({ case_id });

    const results = {
      deleted: [],
      retained: [],
      errors: []
    };

    for (const doc of documents) {
      const policy = doc.retention_policy || 'retain_legal';
      
      try {
        if (policy === 'delete_on_close') {
          // Delete sensitive documents (IDs, bank statements, etc.)
          await base44.entities.Document.delete(doc.id);
          results.deleted.push({
            id: doc.id,
            name: doc.name,
            category: doc.category,
            sensitivity: doc.sensitivity
          });
        } else {
          // Retain legal/financial documents
          results.retained.push({
            id: doc.id,
            name: doc.name,
            category: doc.category,
            retention_policy: policy
          });
        }
      } catch (err) {
        results.errors.push({
          doc_id: doc.id,
          error: err.message
        });
      }
    }

    // Log cleanup activity
    await base44.entities.ActivityLog.create({
      case_id,
      action: 'document_cleanup',
      description: `Document cleanup: ${results.deleted.length} deleted, ${results.retained.length} retained`,
      performed_by: user.email,
      metadata: results
    });

    return Response.json({
      status: 'success',
      ...results
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});