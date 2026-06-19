const pool = require('../config/db');
const { hashToken, sanitizeUser } = require('../utils/security');

function getToken(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return req.headers['x-session-token'];
}

async function authenticate(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const result = await pool.query(
      `SELECT
         t.id AS token_id,
         u.id,
         u.full_name,
         u.email,
         u.role,
         u.department,
         u.status,
         u.last_login_at,
         u.created_at,
         u.updated_at
       FROM auth_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
         AND t.expires_at > NOW()
         AND u.status = 'active'
       LIMIT 1`,
      [hashToken(token)]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    req.user = sanitizeUser(result.rows[0]);
    req.tokenId = result.rows[0].token_id;
    req.sessionToken = token;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};