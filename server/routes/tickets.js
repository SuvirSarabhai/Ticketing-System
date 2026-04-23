const express = require('express');
const pool    = require('../db/pool');
const { authenticateToken, requireAdmin, requireAgent } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

// Generate next ticket number from the DB sequence (TKT-1001, TKT-1002, …)
async function generateTicketNumber(client) {
  const result = await client.query("SELECT nextval('ticket_number_seq') AS seq");
  return `TKT-${result.rows[0].seq}`;
}

// Auto-assignment engine — mirrors TicketContext.autoAssignTicket() logic exactly
// Returns the matched user UUID or null if no rule matches
async function findAutoAssignTarget(client, ticket) {
  const result = await client.query(
    `SELECT * FROM assignment_rules
     WHERE (category_id    IS NULL OR category_id    = $1)
       AND (subcategory_id IS NULL OR subcategory_id = $2)
       AND (urgency        IS NULL OR urgency        = $3)
     ORDER BY priority ASC
     LIMIT 1`,
    [ticket.category_id, ticket.subcategory_id, ticket.urgency]
  );
  return result.rows.length > 0 ? result.rows[0].assign_to_user_id : null;
}

// Builds the full ticket SELECT with all joined fields
// role-based WHERE clause is injected as a parameter
const TICKET_SELECT = `
  SELECT
    t.id, t.ticket_number, t.urgency, t.status,
    t.title, t.description, t.form_data,
    t.created_at, t.updated_at, t.resolved_at, t.closed_at, t.resolution_time,
    t.company_id,   comp.name   AS company_name,
    t.domain_id,    dom.name    AS domain_name,
    t.category_id,  cat.name    AS category_name,
    t.subcategory_id, sub.name  AS subcategory_name,
    sub.form_fields             AS subcategory_form_fields,
    t.created_by,
      cb.name   AS created_by_name,
      cb.email  AS created_by_email,
    t.assigned_to,
      ag.name   AS assigned_to_name,
      ag.email  AS assigned_to_email,
      ag.department AS assigned_to_department
  FROM tickets t
  LEFT JOIN companies   comp ON comp.id = t.company_id
  LEFT JOIN domains     dom  ON dom.id  = t.domain_id
  LEFT JOIN categories  cat  ON cat.id  = t.category_id
  LEFT JOIN subcategories sub ON sub.id = t.subcategory_id
  LEFT JOIN users       cb   ON cb.id   = t.created_by
  LEFT JOIN users       ag   ON ag.id   = t.assigned_to
`;

// ── GET /api/tickets ──────────────────────────────────────────────────────────
// Role-filtered list: admin → all | agent → assigned + open | user → own
// Optional query params: ?status=  ?urgency=  ?search=
router.get('/', authenticateToken, async (req, res) => {
  const { status, urgency, search } = req.query;
  const { id: userId, role } = req.user;

  try {
    // Build role-based WHERE
    let roleClause;
    const roleParams = [];
    if (role === 'admin') {
      roleClause = '1=1'; // all tickets
    } else if (role === 'agent') {
      roleClause = `(t.assigned_to = $${roleParams.length + 1} OR (t.status = 'open' AND t.assigned_to IS NULL))`;
      roleParams.push(userId);
    } else {
      roleClause = `t.created_by = $${roleParams.length + 1}`;
      roleParams.push(userId);
    }

    // Build optional filter clauses
    const filters = [];
    const params  = [...roleParams];

    if (status) {
      params.push(status);
      filters.push(`t.status = $${params.length}`);
    }
    if (urgency) {
      params.push(urgency);
      filters.push(`t.urgency = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      filters.push(`(t.ticket_number ILIKE $${idx} OR t.title ILIKE $${idx} OR t.description ILIKE $${idx})`);
    }

    const whereClause = [roleClause, ...filters].join(' AND ');

    const result = await pool.query(
      `${TICKET_SELECT} WHERE ${whereClause} ORDER BY t.created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────
// Create a new ticket, then run auto-assign immediately
router.post('/', authenticateToken, async (req, res) => {
  const {
    domainId, categoryId, subcategoryId,
    urgency, title, description, formData,
  } = req.body;

  if (!categoryId || !subcategoryId || !urgency || !title || !description) {
    return res.status(400).json({
      error: 'categoryId, subcategoryId, urgency, title, and description are required',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve the user's company_id from the DB (never trust the client for this)
    const userRow = await client.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
    const companyId = userRow.rows[0]?.company_id || null;

    const ticketNumber = await generateTicketNumber(client);

    // Insert the ticket
    const insert = await client.query(
      `INSERT INTO tickets
         (ticket_number, company_id, domain_id, category_id, subcategory_id,
          urgency, status, title, description, form_data, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10)
       RETURNING *`,
      [
        ticketNumber,
        companyId,
        domainId     || null,
        categoryId,
        subcategoryId,
        urgency,
        title,
        description,
        formData ? JSON.stringify(formData) : '{}',
        req.user.id,
      ]
    );

    const ticket = insert.rows[0];

    // Auto-assign: find matching rule
    const assignTarget = await findAutoAssignTarget(client, ticket);
    if (assignTarget) {
      await client.query(
        `UPDATE tickets
         SET assigned_to = $1, status = 'assigned'
         WHERE id = $2`,
        [assignTarget, ticket.id]
      );
      ticket.assigned_to = assignTarget;
      ticket.status      = 'assigned';
    }

    await client.query('COMMIT');

    // Return the full enriched ticket
    const full = await pool.query(
      `${TICKET_SELECT} WHERE t.id = $1`,
      [ticket.id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ── GET /api/tickets/:id ──────────────────────────────────────────────────────
// Single enriched ticket — all users can fetch their own; agents/admin see all
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  try {
    const result = await pool.query(
      `${TICKET_SELECT} WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // Regular users can only view their own tickets
    if (role === 'user' && ticket.created_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('GET /tickets/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PATCH /api/tickets/:id ────────────────────────────────────────────────────
// General-purpose update: status, urgency, assigned_to (agent/admin only)
router.patch('/:id', authenticateToken, requireAgent, async (req, res) => {
  const { id }  = req.params;
  const updates = req.body; // { status?, urgency?, assigned_to? }

  const allowed  = ['status', 'urgency', 'assigned_to'];
  const fields   = Object.keys(updates).filter((k) => allowed.includes(k));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
  const values     = fields.map((f) => updates[f]);
  values.push(id); // WHERE clause param

  try {
    const result = await pool.query(
      `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const full = await pool.query(`${TICKET_SELECT} WHERE t.id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    console.error('PATCH /tickets/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/tickets/:id/assign ──────────────────────────────────────────────
// Manual assignment — agent/admin picks a specific agent
// Body: { agentId: UUID }  OR  { agentId: null } to unassign
router.post('/:id/assign', authenticateToken, requireAgent, async (req, res) => {
  const { id }      = req.params;
  const { agentId } = req.body;

  try {
    const newStatus = agentId ? 'assigned' : 'open';
    const result = await pool.query(
      `UPDATE tickets SET assigned_to = $1, status = $2 WHERE id = $3 RETURNING id`,
      [agentId || null, newStatus, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const full = await pool.query(`${TICKET_SELECT} WHERE t.id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    console.error('POST /tickets/:id/assign error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/tickets/:id/auto-assign ────────────────────────────────────────
// Runs the rule engine on an existing ticket
// Used when admin wants to trigger auto-assign manually after ticket creation
router.post('/:id/auto-assign', authenticateToken, requireAgent, async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    const ticketResult = await client.query(
      'SELECT id, category_id, subcategory_id, urgency FROM tickets WHERE id = $1',
      [id]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket       = ticketResult.rows[0];
    const assignTarget = await findAutoAssignTarget(client, ticket);

    if (!assignTarget) {
      return res.status(200).json({ message: 'No matching rule found — ticket remains unassigned' });
    }

    await client.query(
      `UPDATE tickets SET assigned_to = $1, status = 'assigned' WHERE id = $2`,
      [assignTarget, id]
    );

    const full = await pool.query(`${TICKET_SELECT} WHERE t.id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    console.error('POST /tickets/:id/auto-assign error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ── POST /api/tickets/:id/resolve ─────────────────────────────────────────────
// Agent marks ticket as resolved; calculates resolution_time in minutes
router.post('/:id/resolve', authenticateToken, requireAgent, async (req, res) => {
  const { id } = req.params;

  try {
    const ticketResult = await pool.query(
      'SELECT created_at, status FROM tickets WHERE id = $1',
      [id]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (ticketResult.rows[0].status === 'closed') {
      return res.status(400).json({ error: 'Cannot resolve a closed ticket' });
    }

    const resolvedAt      = new Date();
    const resolutionTime  = Math.floor(
      (resolvedAt - new Date(ticketResult.rows[0].created_at)) / 60000
    );

    await pool.query(
      `UPDATE tickets
       SET status = 'resolved', resolved_at = $1, resolution_time = $2
       WHERE id = $3`,
      [resolvedAt, resolutionTime, id]
    );

    const full = await pool.query(`${TICKET_SELECT} WHERE t.id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    console.error('POST /tickets/:id/resolve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/tickets/:id/close ───────────────────────────────────────────────
// User confirms resolution OR agent force-closes
// Any authenticated user who owns the ticket can close; agents can close any
router.post('/:id/close', authenticateToken, async (req, res) => {
  const { id }              = req.params;
  const { id: userId, role } = req.user;

  try {
    const ticketResult = await pool.query(
      'SELECT created_by, status FROM tickets WHERE id = $1',
      [id]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Permission: agent/admin can close any; user can only close their own
    const isAgent = ['admin', 'agent'].includes(role);
    if (!isAgent && ticket.created_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Ticket is already closed' });
    }

    await pool.query(
      `UPDATE tickets SET status = 'closed', closed_at = NOW() WHERE id = $1`,
      [id]
    );

    const full = await pool.query(`${TICKET_SELECT} WHERE t.id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    console.error('POST /tickets/:id/close error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
