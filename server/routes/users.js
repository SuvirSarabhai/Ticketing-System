const express = require('express');
const pool    = require('../db/pool');
const { authenticateToken, requireAdmin, requireAgent } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users ────────────────────────────────────────────────────────────
// Returns all users — admin and agents only
// Used by: Admin page user table, assignment dropdowns
router.get('/', authenticateToken, requireAgent, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, department, created_at
       FROM users
       ORDER BY role ASC, name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/users/agents ─────────────────────────────────────────────────────
// Returns only agents + admins — used by ticket assignment dropdowns
// Must be defined BEFORE /users/:id so Express doesn't treat "agents" as an id
router.get('/agents', authenticateToken, requireAgent, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, department, created_at
       FROM users
       WHERE role IN ('agent', 'admin')
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /users/agents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
// Returns a single user by id — admin/agent only
// Used to resolve user names in ticket detail view
router.get('/:id', authenticateToken, requireAgent, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, department, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /users/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
