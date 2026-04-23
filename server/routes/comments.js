const express = require('express');
const pool    = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // gives access to :ticketId from parent

// ── Helpers ───────────────────────────────────────────────────────────────────

// Verify the ticket exists and the requesting user has permission to view it
async function verifyTicketAccess(ticketId, userId, role) {
  const result = await pool.query(
    'SELECT id, created_by FROM tickets WHERE id = $1',
    [ticketId]
  );
  if (result.rows.length === 0) return { error: 'Ticket not found', code: 404 };

  const ticket = result.rows[0];
  const isAgent = ['admin', 'agent'].includes(role);

  // Regular users can only access their own tickets
  if (!isAgent && ticket.created_by !== userId) {
    return { error: 'Access denied', code: 403 };
  }
  return { ticket };
}

// ── GET /api/tickets/:ticketId/comments ───────────────────────────────────────
// Returns all comments for a ticket, joined with commenter name + role
// Ordered oldest-first for natural thread reading
router.get('/', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;
  const { id: userId, role } = req.user;

  try {
    const access = await verifyTicketAccess(ticketId, userId, role);
    if (access.error) {
      return res.status(access.code).json({ error: access.error });
    }

    const result = await pool.query(
      `SELECT
         c.id,
         c.ticket_id,
         c.content,
         c.created_at,
         c.user_id,
         u.name  AS user_name,
         u.email AS user_email,
         u.role  AS user_role,
         u.department AS user_department
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [ticketId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /tickets/:ticketId/comments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/tickets/:ticketId/comments ──────────────────────────────────────
// Any authenticated user with ticket access can add a comment
// Also bumps the ticket's updated_at (handled by DB trigger automatically)
router.post('/', authenticateToken, async (req, res) => {
  const { ticketId }  = req.params;
  const { id: userId, role } = req.user;
  const { content }   = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const access = await verifyTicketAccess(ticketId, userId, role);
    if (access.error) {
      return res.status(access.code).json({ error: access.error });
    }

    // Block comments on closed tickets (agents can still add notes)
    const isAgent = ['admin', 'agent'].includes(role);
    if (!isAgent) {
      const statusCheck = await pool.query(
        'SELECT status FROM tickets WHERE id = $1',
        [ticketId]
      );
      if (statusCheck.rows[0]?.status === 'closed') {
        return res.status(400).json({ error: 'Cannot comment on a closed ticket' });
      }
    }

    // Insert the comment
    const insert = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, ticket_id, user_id, content, created_at`,
      [ticketId, userId, content.trim()]
    );

    // Return the comment enriched with user info (consistent shape with GET)
    const result = await pool.query(
      `SELECT
         c.id,
         c.ticket_id,
         c.content,
         c.created_at,
         c.user_id,
         u.name  AS user_name,
         u.email AS user_email,
         u.role  AS user_role,
         u.department AS user_department
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [insert.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /tickets/:ticketId/comments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
