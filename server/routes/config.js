const express = require('express');
const pool    = require('../db/pool');
const { authenticateToken, requireAdmin, requireAgent } = require('../middleware/auth');

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT RULES
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/config/assignment-rules ─────────────────────────────────────────
// Returns all rules enriched with category / subcategory / agent names
// Accessible by agents + admins (agents can view but not modify)
router.get('/assignment-rules', authenticateToken, requireAgent, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ar.id,
         ar.priority,
         ar.urgency,
         ar.category_id,    cat.name AS category_name,
         ar.subcategory_id, sub.name AS subcategory_name,
         ar.assign_to_user_id,
         u.name  AS assign_to_user_name,
         u.email AS assign_to_user_email
       FROM assignment_rules ar
       LEFT JOIN categories    cat ON cat.id = ar.category_id
       LEFT JOIN subcategories sub ON sub.id = ar.subcategory_id
       LEFT JOIN users         u   ON u.id   = ar.assign_to_user_id
       ORDER BY ar.priority ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /config/assignment-rules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/config/assignment-rules ────────────────────────────────────────
// Replaces ALL assignment rules atomically (mirrors AdminPage.handleSaveRules)
// Body: { rules: [{ categoryId?, subcategoryId?, urgency?, assignToUserId, priority }] }
router.post('/assignment-rules', authenticateToken, requireAdmin, async (req, res) => {
  const { rules } = req.body;

  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'rules must be an array' });
  }

  // Validate each rule has the mandatory field
  for (const rule of rules) {
    if (!rule.assignToUserId) {
      return res.status(400).json({ error: 'Each rule must have assignToUserId' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete all existing rules then re-insert (clean replace)
    await client.query('DELETE FROM assignment_rules');

    for (const rule of rules) {
      await client.query(
        `INSERT INTO assignment_rules
           (category_id, subcategory_id, urgency, assign_to_user_id, priority)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          rule.categoryId    || null,
          rule.subcategoryId || null,
          rule.urgency       || null,
          rule.assignToUserId,
          rule.priority      || 1,
        ]
      );
    }

    await client.query('COMMIT');

    // Return the freshly saved rules with names
    const result = await pool.query(
      `SELECT
         ar.id, ar.priority, ar.urgency,
         ar.category_id,    cat.name AS category_name,
         ar.subcategory_id, sub.name AS subcategory_name,
         ar.assign_to_user_id,
         u.name AS assign_to_user_name
       FROM assignment_rules ar
       LEFT JOIN categories    cat ON cat.id = ar.category_id
       LEFT JOIN subcategories sub ON sub.id = ar.subcategory_id
       LEFT JOIN users         u   ON u.id   = ar.assign_to_user_id
       ORDER BY ar.priority ASC`
    );

    res.status(200).json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /config/assignment-rules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-CLOSE CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/config/auto-close ────────────────────────────────────────────────
// Returns the single-row auto-close config
router.get('/auto-close', authenticateToken, requireAgent, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT high_hours, medium_hours, low_hours FROM auto_close_config WHERE id = 1'
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auto-close config not found' });
    }

    // Return in the same shape as the frontend defaultAutoCloseConfig
    const row = result.rows[0];
    res.json({
      high:   row.high_hours,
      medium: row.medium_hours,
      low:    row.low_hours,
    });
  } catch (err) {
    console.error('GET /config/auto-close error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/config/auto-close ────────────────────────────────────────────────
// Updates the auto-close window per urgency level (admin only)
// Body: { high: 24, medium: 48, low: 72 }
router.put('/auto-close', authenticateToken, requireAdmin, async (req, res) => {
  const { high, medium, low } = req.body;

  if (
    typeof high   !== 'number' || high   < 1 ||
    typeof medium !== 'number' || medium < 1 ||
    typeof low    !== 'number' || low    < 1
  ) {
    return res.status(400).json({
      error: 'high, medium, and low must be positive integers (hours)',
    });
  }

  try {
    await pool.query(
      `UPDATE auto_close_config
       SET high_hours = $1, medium_hours = $2, low_hours = $3
       WHERE id = 1`,
      [high, medium, low]
    );

    res.json({ high, medium, low });
  } catch (err) {
    console.error('PUT /config/auto-close error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
