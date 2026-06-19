const pool = require('../config/db');

async function listUsers(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, department, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createUser(req, res) {
  const { fullName, email, role = 'viewer', department, status = 'active' } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, role, department, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, department, status, created_at`,
      [fullName, email, role, department || null, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listUsers,
  createUser,
};
