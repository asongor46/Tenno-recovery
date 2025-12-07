// =====================================================
// COUNTY PROFILES INDEX
// =====================================================
// Central registry of all county scraper profiles

import { BrowardProfile } from './BrowardProfile.js';

export const COUNTY_PROFILES = {
  'broward_fl': BrowardProfile,
  // Add more county profiles here as they are implemented
  // 'miami_dade_fl': MiamiDadeProfile,
  // 'maricopa_az': MaricopaProfile,
};

/**
 * Get county profile by various identifiers
 */
export function getCountyProfile(countyName, state) {
  const normalizedName = countyName?.toLowerCase().replace(/\s+/g, '_');
  const normalizedState = state?.toLowerCase();
  const key = `${normalizedName}_${normalizedState}`;
  
  return COUNTY_PROFILES[key] || null;
}