const pool = require('../config/db');

async function listApprovals(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.status,
         a.due_date,
         a.notes,
         a.created_at,
         a.updated_at,
         d.title AS document_title,
         COALESCE(req.full_name, 'Unassigned') AS requested_by,
         COALESCE(rev.full_name, 'Unassigned') AS reviewer_name
       FROM approvals a
       INNER JOIN documents d ON d.id = a.document_id
       LEFT JOIN users req ON req.id = a.requested_by_user_id
       LEFT JOIN users rev ON rev.id = a.reviewer_user_id
       ORDER BY a.updated_at DESC, a.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createApproval(req, res) {
  const { documentId, requestedByUserId, reviewerUserId, status = 'pending', dueDate, notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO approvals
       (document_id, requested_by_user_id, reviewer_user_id, status, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [documentId, requestedByUserId || null, reviewerUserId || null, status, dueDate || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listApprovals,
  createApproval,
};
