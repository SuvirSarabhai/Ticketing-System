const express = require('express');
const pool    = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All catalog endpoints require authentication (no public access)

// ── GET /api/companies ────────────────────────────────────────────────────────
router.get('/companies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM companies ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /companies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/domains ──────────────────────────────────────────────────────────
router.get('/domains', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM domains ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /domains error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/categories?domainId= ────────────────────────────────────────────
// Returns all categories, or only those in a specific domain if ?domainId= is provided
router.get('/categories', authenticateToken, async (req, res) => {
  const { domainId } = req.query;

  try {
    let query, params;
    if (domainId) {
      query  = 'SELECT id, name, domain_id FROM categories WHERE domain_id = $1 ORDER BY name ASC';
      params = [domainId];
    } else {
      query  = 'SELECT id, name, domain_id FROM categories ORDER BY name ASC';
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/subcategories?categoryId= ───────────────────────────────────────
// Returns all subcategories, or only those under a specific category
// form_fields JSONB is returned as-is — the frontend uses it directly
router.get('/subcategories', authenticateToken, async (req, res) => {
  const { categoryId } = req.query;

  try {
    let query, params;
    if (categoryId) {
      query  = 'SELECT id, name, category_id, form_fields FROM subcategories WHERE category_id = $1 ORDER BY name ASC';
      params = [categoryId];
    } else {
      query  = 'SELECT id, name, category_id, form_fields FROM subcategories ORDER BY name ASC';
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /subcategories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
