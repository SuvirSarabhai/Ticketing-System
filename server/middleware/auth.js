const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Verify access token ────────────────────────────────────────────────────────
// Identical to login-react pattern; attaches decoded { id, email, role } to req.user
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).send('Access denied: no token provided');

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).send('Invalid or expired token');
    req.user = user; // { id, email, role }
    next();
  });
}

// ── Role guards ───────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).send('Admin access required');
  }
  next();
}

function requireAgent(req, res, next) {
  if (!['admin', 'agent'].includes(req.user?.role)) {
    return res.status(403).send('Agent or admin access required');
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, requireAgent };
