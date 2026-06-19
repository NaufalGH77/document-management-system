const pool = require('../config/db');

const allowedStatuses = ['pending', 'approved', 'rejected', 'changes_requested', 'cancelled'];

function mapDocumentStatus(status) {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'draft';
    default:
      return 'pending';
  }
}

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

  if (!documentId) {
    return res.status(400).json({ error: 'documentId is required' });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid approval status' });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO approvals
         (document_id, requested_by_user_id, reviewer_user_id, status, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [documentId, requestedByUserId || req.user.id, reviewerUserId || null, status, dueDate || null, notes || null]
      );

      await client.query(
        `UPDATE documents
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [mapDocumentStatus(status), documentId]
      );

      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateApproval(req, res) {
  const { id } = req.params;
  const { status, notes, reviewerUserId } = req.body;

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Valid status is required' });
  }

  try {
    const approval = await pool.query('SELECT document_id FROM approvals WHERE id = $1', [id]);

    if (approval.rowCount === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE approvals
         SET status = $1,
             notes = COALESCE($2, notes),
             reviewer_user_id = COALESCE($3, reviewer_user_id),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status, notes || null, reviewerUserId || req.user.id, id]
      );

      await client.query(
        `UPDATE documents
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [mapDocumentStatus(status), approval.rows[0].document_id]
      );

      await client.query('COMMIT');

      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createApproval,
  listApprovals,
  updateApproval,
};
