// =====================================================
// COUNTY SCRAPER INVOCATION ENDPOINT
// =====================================================
// Backend function that wraps CountyScraperEngine
// Called by other backend functions (resolveParcelOwner, calculateSurplus, etc.)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { run as runCountyScraper } from '../components/engines/CountyScraperEngine.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request payload
    const { countyId, operation, input } = await req.json();
    
    if (!countyId || !operation) {
      return Response.json({ 
        error: 'Missing required fields: countyId, operation' 
      }, { status: 400 });
    }

    // Run county scraper
    const result = await runCountyScraper({ countyId, operation, input });

    return Response.json(result);

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});