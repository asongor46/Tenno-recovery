// =====================================================
// SURPLUS PAGE SCRAPER
// =====================================================
// Scrapes surplus list pages and returns extracted case data
// Delegates to CountyScraperEngine for actual parsing

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, county, state } = await req.json();
    
    if (!url) {
      return Response.json({ 
        error: 'Missing required field: url' 
      }, { status: 400 });
    }

    // Map county to profile ID
    const normalizedCounty = county?.toLowerCase().replace(/\s+/g, '_');
    const normalizedState = state?.toLowerCase();
    const countyId = `${normalizedCounty}_${normalizedState}`;
    
    // REMOVED MOCK DATA - Now calls CountyScraperEngine
    const { run: runCountyScraper } = await import('../components/engines/CountyScraperEngine.js');
    
    const result = await runCountyScraper({
      countyId,
      operation: 'SURPLUS_LIST',
      input: { url },
    });
    
    if (result.status === 'error') {
      return Response.json({
        status: 'error',
        errors: result.errors,
        cases: [],
      });
    }
    
    return Response.json({
      status: 'success',
      cases: result.cases || [],
      errors: result.errors || [],
      note: result.cases?.length > 0 
        ? `Extracted ${result.cases.length} case(s)` 
        : 'No cases extracted - check URL or county profile',
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});