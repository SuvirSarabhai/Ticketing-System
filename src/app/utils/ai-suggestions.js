/**
 * ai-suggestions.js
 *
 * Thin client wrapper for POST /api/ai/suggest.
 * The engine (rules or Gemini) runs on the server — this module
 * just calls the endpoint and returns the suggestions map.
 *
 * Drop-in replacement for the old local rule engine:
 *   Before: import { suggestFormFields } from '../utils/ai-suggestions'
 *   After:  same import, same call signature, now async
 */

import { api, parseResponse } from './api';

/**
 * @param {string} description  - Free-text issue description from the user
 * @param {string} subcategoryId - UUID of the selected subcategory
 * @returns {Promise<Object>}   - { [fieldId]: suggestedValue }
 */
export async function suggestFormFields(description, subcategoryId) {
  try {
    const res  = await api.post('/api/ai/suggest', { description, subcategoryId });
    const data = await parseResponse(res);
    return data?.suggestions || {};
  } catch (err) {
    console.warn('AI suggest failed, returning empty suggestions:', err.message);
    return {};
  }
}
