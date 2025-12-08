import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PHASE 1 - FUNCTION 1: Name Normalization
 * Parses raw owner names into structured components
 * Handles "LAST, FIRST" and other common patterns
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { raw_name } = await req.json();
    
    if (!raw_name || typeof raw_name !== 'string') {
      return Response.json({ 
        error: 'Missing or invalid raw_name parameter' 
      }, { status: 400 });
    }

    // Parse the name
    const parsed = parseOwnerName(raw_name);

    return Response.json({
      status: 'success',
      input: raw_name,
      parsed,
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Main parsing function
 */
function parseOwnerName(rawName) {
  // Clean up the input
  let cleaned = rawName.trim()
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .replace(/\.$/, '');    // Remove trailing period

  // Extract suffix first (Jr, Sr, II, III, IV, etc.)
  const suffixPattern = /\s+(JR\.?|SR\.?|[IVX]+|ESQ\.?|MD\.?|PHD\.?)$/i;
  const suffixMatch = cleaned.match(suffixPattern);
  const suffix = suffixMatch ? suffixMatch[1].toUpperCase().replace('.', '') : null;
  
  if (suffix) {
    cleaned = cleaned.replace(suffixPattern, '').trim();
  }

  // Detect common patterns
  const patterns = [
    // Pattern 1: "LAST, FIRST MIDDLE" or "LAST, FIRST M."
    {
      regex: /^([A-Z\s'-]+),\s+([A-Z][a-z]+)\s*([A-Z]\.?)?$/i,
      extract: (match) => ({
        last_name: capitalizeWords(match[1].trim()),
        first_name: capitalizeWords(match[2].trim()),
        middle_name: match[3] ? match[3].replace('.', '').toUpperCase() : null,
      }),
    },
    
    // Pattern 2: "LAST,FIRST" (no space after comma)
    {
      regex: /^([A-Z\s'-]+),([A-Z][a-z]+)$/i,
      extract: (match) => ({
        last_name: capitalizeWords(match[1].trim()),
        first_name: capitalizeWords(match[2].trim()),
        middle_name: null,
      }),
    },
    
    // Pattern 3: "FIRST MIDDLE LAST" (normal order)
    {
      regex: /^([A-Z][a-z]+)\s+([A-Z]\.?)\s+([A-Z][a-z\s'-]+)$/i,
      extract: (match) => ({
        first_name: capitalizeWords(match[1].trim()),
        middle_name: match[2].replace('.', '').toUpperCase(),
        last_name: capitalizeWords(match[3].trim()),
      }),
    },
    
    // Pattern 4: "FIRST LAST" (no middle)
    {
      regex: /^([A-Z][a-z]+)\s+([A-Z][a-z\s'-]+)$/i,
      extract: (match) => ({
        first_name: capitalizeWords(match[1].trim()),
        middle_name: null,
        last_name: capitalizeWords(match[2].trim()),
      }),
    },
    
    // Pattern 5: All caps "FIRST LAST"
    {
      regex: /^([A-Z]+)\s+([A-Z\s'-]+)$/,
      extract: (match) => ({
        first_name: capitalizeWords(match[1].trim()),
        middle_name: null,
        last_name: capitalizeWords(match[2].trim()),
      }),
    },
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = cleaned.match(pattern.regex);
    if (match) {
      const result = pattern.extract(match);
      
      return {
        ...result,
        suffix,
        full_name: buildFullName(result, suffix),
        parsing_confidence: 'high',
        parsing_method: 'pattern_match',
      };
    }
  }

  // Fallback: couldn't parse confidently
  const parts = cleaned.split(/\s+/);
  
  if (parts.length === 1) {
    // Single word - assume last name
    return {
      first_name: null,
      middle_name: null,
      last_name: capitalizeWords(parts[0]),
      suffix,
      full_name: buildFullName({ first_name: null, middle_name: null, last_name: capitalizeWords(parts[0]) }, suffix),
      parsing_confidence: 'low',
      parsing_method: 'fallback_single',
    };
  } else if (parts.length === 2) {
    // Two words - assume first last
    return {
      first_name: capitalizeWords(parts[0]),
      middle_name: null,
      last_name: capitalizeWords(parts[1]),
      suffix,
      full_name: buildFullName({ first_name: capitalizeWords(parts[0]), middle_name: null, last_name: capitalizeWords(parts[1]) }, suffix),
      parsing_confidence: 'medium',
      parsing_method: 'fallback_two_parts',
    };
  } else {
    // Multiple words - first middle last
    return {
      first_name: capitalizeWords(parts[0]),
      middle_name: parts.slice(1, -1).join(' ').toUpperCase(),
      last_name: capitalizeWords(parts[parts.length - 1]),
      suffix,
      full_name: buildFullName({
        first_name: capitalizeWords(parts[0]),
        middle_name: parts.slice(1, -1).join(' ').toUpperCase(),
        last_name: capitalizeWords(parts[parts.length - 1]),
      }, suffix),
      parsing_confidence: 'medium',
      parsing_method: 'fallback_multi_parts',
    };
  }
}

/**
 * Capitalize words properly (handling all-caps input)
 */
function capitalizeWords(str) {
  if (!str) return str;
  
  // Special cases for name particles
  const particles = ['van', 'von', 'de', 'la', 'le', 'del', 'da', 'di'];
  
  return str.split(/\s+/)
    .map(word => {
      const lower = word.toLowerCase();
      if (particles.includes(lower)) {
        return lower;
      }
      // Handle hyphenated names
      if (word.includes('-')) {
        return word.split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('-');
      }
      // Handle possessive apostrophes (O'Brien, D'Angelo)
      if (word.includes("'")) {
        return word.split("'").map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Build full name from components
 */
function buildFullName(parts, suffix) {
  const nameArray = [
    parts.first_name,
    parts.middle_name,
    parts.last_name,
    suffix,
  ].filter(Boolean);
  
  return nameArray.join(' ');
}