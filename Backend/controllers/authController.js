const pool = require('../config/db');
const { createToken, hashPassword, hashToken, sanitizeUser, verifyPassword } = require('../utils/security');

async function issueToken(userId) {
  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return { token, expiresAt };
}

async function register(req, res) {
  const { fullName, email, password, department } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'fullName, email, and password are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const { salt, hash } = hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, password_salt, role, department, status)
       VALUES ($1, $2, $3, $4, 'user', $5, 'active')
       RETURNING id, full_name, email, role, department, status, last_login_at, created_at, updated_at`,
      [fullName, email.toLowerCase(), hash, salt, department || null]
    );

    const token = await issueToken(result.rows[0].id);

    res.status(201).json({
      user: sanitizeUser(result.rows[0]),
      token: token.token,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, department, status, password_hash, password_salt, last_login_at, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    if (!verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = await issueToken(user.id);

    await pool.query(
      `UPDATE users
       SET last_login_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    res.json({
      user: sanitizeUser(user),
      token: token.token,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

async function logout(req, res) {
  try {
    await pool.query('DELETE FROM auth_tokens WHERE id = $1', [req.tokenId]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  login,
  logout,
  me,
  register,
};