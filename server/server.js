const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// Initialise DB pool (connection confirmed on load)
require('./db/pool');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes (mounted phase by phase) ──────────────────────────────────────────
// Phase 2: Auth
app.use('/api/auth',    require('./routes/auth'));
// Phase 3: Catalog (companies, domains, categories, subcategories)
app.use('/api',         require('./routes/catalog'));
// Phase 4: Users
app.use('/api/users',   require('./routes/users'));
// Phase 5: Tickets
app.use('/api/tickets', require('./routes/tickets'));
// Phase 6: Comments (nested under tickets)
app.use('/api/tickets/:ticketId/comments', require('./routes/comments'));
// Phase 7: Admin config (assignment rules + auto-close)
app.use('/api/config',  require('./routes/config'));
// Phase 8: AI suggestions
app.use('/api/ai',      require('./routes/ai'));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀  Ticketing server running on port ${PORT}`);
});
