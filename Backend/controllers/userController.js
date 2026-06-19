const crypto = require('crypto');
const pool = require('../config/db');
const { hashPassword, isValidRole, sanitizeUser } = require('../utils/security');

async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, department, status, last_login_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map(sanitizeUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createUser(req, res) {
  const { fullName, email, role = 'user', department, status = 'active', password } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'fullName and email are required' });
  }

  if (!isValidRole(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const plainPassword = password || 'ChangeMe123!';
    const { salt, hash } = hashPassword(plainPassword);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, password_salt, role, department, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, role, department, status, last_login_at, created_at, updated_at`,
      [fullName, email.toLowerCase(), hash, salt, role, department || null, status]
    );

    res.status(201).json(sanitizeUser(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getCurrentUser(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, department, status, last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateCurrentUser(req, res) {
  const { fullName, email, department, password, currentPassword } = req.body;

  try {
    const current = await pool.query('SELECT id, password_hash, password_salt FROM users WHERE id = $1', [req.user.id]);

    if (current.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const values = [];
    let index = 1;

    if (fullName) {
      updates.push(`full_name = $${index}`);
      values.push(fullName);
      index += 1;
    }

    if (email) {
      const duplicate = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email.toLowerCase(), req.user.id]);

      if (duplicate.rowCount > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      updates.push(`email = $${index}`);
      values.push(email.toLowerCase());
      index += 1;
    }

    if (department !== undefined) {
      updates.push(`department = $${index}`);
      values.push(department || null);
      index += 1;
    }

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'currentPassword is required when changing password' });
      }

      const derived = crypto.scryptSync(currentPassword, current.rows[0].password_salt, 64).toString('hex');

      if (derived !== current.rows[0].password_hash) {
        return res.status(400).json({ error: 'Current password is invalid' });
      }

      const { salt, hash } = hashPassword(password);
      updates.push(`password_salt = $${index}`);
      values.push(salt);
      index += 1;
      updates.push(`password_hash = $${index}`);
      values.push(hash);
      index += 1;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${index}
       RETURNING id, full_name, email, role, department, status, last_login_at, created_at, updated_at`,
      values
    );

    res.json(sanitizeUser(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getUserById(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, department, status, last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateUser(req, res) {
  const { fullName, email, role, department, status, password } = req.body;

  if (role && !isValidRole(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const current = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);

    if (current.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email) {
      const duplicate = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email.toLowerCase(), req.params.id]);

      if (duplicate.rowCount > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updates = [];
    const values = [];
    let index = 1;

    if (fullName) {
      updates.push(`full_name = $${index}`);
      values.push(fullName);
      index += 1;
    }

    if (email) {
      updates.push(`email = $${index}`);
      values.push(email.toLowerCase());
      index += 1;
    }

    if (role) {
      updates.push(`role = $${index}`);
      values.push(role);
      index += 1;
    }

    if (department !== undefined) {
      updates.push(`department = $${index}`);
      values.push(department || null);
      index += 1;
    }

    if (status) {
      updates.push(`status = $${index}`);
      values.push(status);
      index += 1;
    }

    if (password) {
      const { salt, hash } = hashPassword(password);
      updates.push(`password_salt = $${index}`);
      values.push(salt);
      index += 1;
      updates.push(`password_hash = $${index}`);
      values.push(hash);
      index += 1;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${index}
       RETURNING id, full_name, email, role, department, status, last_login_at, created_at, updated_at`,
      values
    );

    res.json(sanitizeUser(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const result = await pool.query(
      `UPDATE users
       SET status = 'inactive', updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createUser,
  deleteUser,
  getCurrentUser,
  getUserById,
  listUsers,
  updateCurrentUser,
  updateUser,
};
