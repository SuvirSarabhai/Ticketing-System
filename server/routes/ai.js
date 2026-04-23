const express = require('express');
const https   = require('https');
const pool    = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE LAYER 1 — Rule-based suggester
// Ported verbatim from src/app/utils/ai-suggestions.js
// Works offline, zero cost, zero latency.
// The subcategoryId here refers to the DB UUID, so we match on form_fields
// labels/types queried fresh from the DB rather than hardcoded mock IDs.
// ══════════════════════════════════════════════════════════════════════════════

function ruleBasedSuggest(description, formFields, subcategoryName) {
  const suggestions  = {};
  const lowerDesc    = description.toLowerCase();
  const subName      = (subcategoryName || '').toLowerCase();

  formFields.forEach((field) => {
    const fieldId    = field.id;
    const fieldLabel = (field.label || '').toLowerCase();

    // ── Software Bug ────────────────────────────────────────────────────────
    if (subName.includes('software bug') || subName.includes('software')) {
      if (fieldLabel.includes('version')) {
        const m = description.match(/v?(\d+\.?\d*\.?\d*)/i);
        if (m) suggestions[fieldId] = m[1];
      }
      if (fieldLabel.includes('operating system') || fieldLabel === 'os') {
        if (lowerDesc.includes('windows'))                          suggestions[fieldId] = 'Windows';
        else if (lowerDesc.includes('mac') || lowerDesc.includes('macos')) suggestions[fieldId] = 'macOS';
        else if (lowerDesc.includes('linux'))                       suggestions[fieldId] = 'Linux';
      }
      if (fieldLabel.includes('steps to reproduce')) {
        suggestions[fieldId] = description;
      }
    }

    // ── Hardware Issue ───────────────────────────────────────────────────────
    if (subName.includes('hardware')) {
      if (fieldLabel.includes('asset tag')) {
        const m = description.match(/\b(LAP|DSK|MON|PRN)-?\d+\b/i);
        if (m) suggestions[fieldId] = m[0].toUpperCase();
      }
      if (fieldLabel.includes('device model')) {
        if (lowerDesc.includes('dell')) {
          const m = description.match(/dell\s+(\w+\s*\d+)/i);
          if (m) suggestions[fieldId] = `Dell ${m[1]}`;
        } else if (lowerDesc.includes('hp')) {
          const m = description.match(/hp\s+(\w+\s*\d+)/i);
          if (m) suggestions[fieldId] = `HP ${m[1]}`;
        } else if (lowerDesc.includes('lenovo')) {
          const m = description.match(/lenovo\s+(\w+\s*\d+)/i);
          if (m) suggestions[fieldId] = `Lenovo ${m[1]}`;
        }
      }
      if (fieldLabel.includes('location')) {
        const m = description.match(/\b(building\s+\w+|floor\s+\d+|room\s+\d+)\b/i);
        if (m) suggestions[fieldId] = m[0];
      }
    }

    // ── Network / Connectivity ───────────────────────────────────────────────
    if (subName.includes('network') || subName.includes('connectivity')) {
      if (fieldLabel.includes('location')) {
        const m = description.match(/\b(building\s+\w+|floor\s+\d+|room\s+\w+|meeting room\s+\w+)\b/i);
        if (m) suggestions[fieldId] = m[0];
      }
      if (fieldLabel.includes('device type')) {
        if (lowerDesc.includes('laptop'))       suggestions[fieldId] = 'Laptop';
        else if (lowerDesc.includes('desktop')) suggestions[fieldId] = 'Desktop';
        else if (lowerDesc.includes('mobile') || lowerDesc.includes('phone')) suggestions[fieldId] = 'Mobile';
      }
      if (fieldLabel.includes('connection type')) {
        if (lowerDesc.includes('wifi') || lowerDesc.includes('wireless'))     suggestions[fieldId] = 'WiFi';
        else if (lowerDesc.includes('ethernet') || lowerDesc.includes('cable')) suggestions[fieldId] = 'Ethernet';
        else if (lowerDesc.includes('vpn'))                                   suggestions[fieldId] = 'VPN';
      }
    }

    // ── Payroll Issue ────────────────────────────────────────────────────────
    if (subName.includes('payroll')) {
      if (fieldLabel.includes('employee id')) {
        const m = description.match(/\b(EMP|ID)-?\d+\b/i);
        if (m) suggestions[fieldId] = m[0].toUpperCase();
      }
      if (fieldLabel.includes('amount')) {
        const m = description.match(/\$?(\d+(?:,\d+)?(?:\.\d{2})?)/);
        if (m) suggestions[fieldId] = m[1].replace(',', '');
      }
      if (fieldLabel.includes('issue details') || fieldLabel.includes('details')) {
        suggestions[fieldId] = description;
      }
    }

    // ── Leave Request ────────────────────────────────────────────────────────
    if (subName.includes('leave')) {
      if (fieldLabel.includes('employee id')) {
        const m = description.match(/\b(EMP|ID)-?\d+\b/i);
        if (m) suggestions[fieldId] = m[0].toUpperCase();
      }
      if (fieldLabel.includes('leave type')) {
        if (lowerDesc.includes('annual') || lowerDesc.includes('vacation'))       suggestions[fieldId] = 'Annual';
        else if (lowerDesc.includes('sick'))                                       suggestions[fieldId] = 'Sick';
        else if (lowerDesc.includes('personal'))                                   suggestions[fieldId] = 'Personal';
        else if (lowerDesc.includes('parental') || lowerDesc.includes('maternity') ||
                 lowerDesc.includes('paternity'))                                  suggestions[fieldId] = 'Parental';
      }
    }

    // ── Building Maintenance ─────────────────────────────────────────────────
    if (subName.includes('building') || subName.includes('maintenance')) {
      if (fieldLabel.includes('building') && !fieldLabel.includes('floor') && !fieldLabel.includes('room')) {
        const m = description.match(/\b(building\s+\w+)\b/i);
        if (m) suggestions[fieldId] = m[0];
      }
      if (fieldLabel.includes('floor') || fieldLabel.includes('room')) {
        const m = description.match(/\b(floor\s+\d+|room\s+\w+)\b/i);
        if (m) suggestions[fieldId] = m[0];
      }
      if (fieldLabel.includes('issue type')) {
        if (lowerDesc.includes('plumbing') || lowerDesc.includes('leak') || lowerDesc.includes('toilet'))
          suggestions[fieldId] = 'Plumbing';
        else if (lowerDesc.includes('electrical') || lowerDesc.includes('light') || lowerDesc.includes('outlet'))
          suggestions[fieldId] = 'Electrical';
        else if (lowerDesc.includes('hvac') || lowerDesc.includes('heat') || lowerDesc.includes('cool') || lowerDesc.includes('air'))
          suggestions[fieldId] = 'HVAC';
        else if (lowerDesc.includes('clean'))
          suggestions[fieldId] = 'Cleaning';
      }
    }
  });

  return suggestions;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE LAYER 2 — Gemini API suggester (used only if GEMINI_API_KEY is set)
// Sends description + field schema to Gemini Flash and asks for JSON fills.
// Falls back to rule engine on any error so the user always gets a response.
// ══════════════════════════════════════════════════════════════════════════════

function callGemini(description, formFields, subcategoryName) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // Build a minimal field schema for the prompt (id + label + type + options)
    const fieldSchema = formFields.map((f) => ({
      id:      f.id,
      label:   f.label,
      type:    f.type,
      options: f.options || null,
    }));

    const prompt = `You are a support ticket assistant. A user submitted this issue description:

"${description}"

The ticket is in the subcategory: "${subcategoryName}"

Below are the form fields that need to be filled in (JSON):
${JSON.stringify(fieldSchema, null, 2)}

Return ONLY a valid JSON object where:
- keys are field "id" values (e.g. "f1", "f2")
- values are the suggested fill-in strings extracted from the description
- only include fields you are confident about — omit fields you cannot infer
- for "select" fields, value must be one of the listed options exactly
- do NOT wrap the response in markdown, just raw JSON`;

    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const parsed = new URL(url);

    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed   = JSON.parse(data);

          // Log Gemini HTTP status for debugging
          if (res.statusCode !== 200) {
            console.warn(`Gemini HTTP ${res.statusCode}:`, JSON.stringify(parsed).substring(0, 200));
            return reject(new Error(`Gemini HTTP ${res.statusCode}`));
          }

          const rawText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          console.log('Gemini raw text:', rawText.substring(0, 300));

          // Strip markdown fences if Gemini wraps in ```json ... ```
          const cleaned = rawText
            .replace(/^```json\s*/im, '')
            .replace(/^```\s*/im, '')
            .replace(/```\s*$/im, '')
            .trim();

          // Extract first JSON object from the cleaned text
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.warn('No JSON object found in Gemini response');
            return reject(new Error('No JSON in Gemini response'));
          }

          const suggestions = JSON.parse(jsonMatch[0]);
          resolve(suggestions);
        } catch (e) {
          console.warn('Gemini response parse failed:', e.message);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(new Error('Gemini timeout')); });
    req.write(body);
    req.end();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/ai/suggest
// Body: { description: string, subcategoryId: UUID }
// Returns: { suggestions: { [fieldId]: value }, engine: "gemini"|"rules" }
// ══════════════════════════════════════════════════════════════════════════════

router.post('/suggest', authenticateToken, async (req, res) => {
  const { description, subcategoryId } = req.body;

  if (!description || !subcategoryId) {
    return res.status(400).json({ error: 'description and subcategoryId are required' });
  }

  try {
    // Fetch form_fields + name from DB (same JSONB structure the frontend uses)
    const subResult = await pool.query(
      'SELECT name, form_fields FROM subcategories WHERE id = $1',
      [subcategoryId]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    const { name: subcategoryName, form_fields: formFields } = subResult.rows[0];

    let suggestions = {};
    let engine      = 'rules';

    // Use Gemini if key is configured, fall back silently on any error
    if (process.env.GEMINI_API_KEY) {
      try {
        suggestions = await callGemini(description, formFields, subcategoryName);
        engine      = 'gemini';
        console.log(`AI suggest (gemini): ${Object.keys(suggestions).length} fields filled`);
      } catch (err) {
        console.warn('Gemini failed, using rule engine:', err.message);
        suggestions = ruleBasedSuggest(description, formFields, subcategoryName);
      }
    } else {
      suggestions = ruleBasedSuggest(description, formFields, subcategoryName);
      console.log(`AI suggest (rules): ${Object.keys(suggestions).length} fields filled`);
    }

    res.json({ suggestions, engine });
  } catch (err) {
    console.error('POST /ai/suggest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
