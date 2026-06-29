const pool = require('../config/db');
const {
  APPROVAL_STAGE,
  DOCUMENT_STATUS,
  getApproverRoleForStage,
  getDocumentStatusForStage,
  getInitialApprovalStage,
  getNextApprovalStage,
} = require('../utils/workflow');

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
         a.stage,
         a.status,
         a.due_date,
         a.notes,
         a.decision_at,
         a.created_at,
         a.updated_at,
         d.title AS document_title,
         d.status AS document_status,
         COALESCE(req.full_name, 'Unassigned') AS requested_by,
         COALESCE(rev.full_name, 'Unassigned') AS reviewer_name,
         COALESCE(dec.full_name, 'Unassigned') AS decision_by_name
       FROM approvals a
       INNER JOIN documents d ON d.id = a.document_id
       LEFT JOIN users req ON req.id = a.requested_by_user_id
       LEFT JOIN users rev ON rev.id = a.reviewer_user_id
       LEFT JOIN users dec ON dec.id = a.decision_by_user_id
       WHERE 
         $1 = 'admin'
         OR ($1 = 'supervisor' AND (a.stage = 'supervisor_review' OR a.requested_by_user_id = $2))
         OR ($1 = 'manager' AND (a.stage = 'manager_review' OR a.requested_by_user_id = $2))
         OR ($1 NOT IN ('admin', 'supervisor', 'manager') AND a.requested_by_user_id = $2)
       ORDER BY a.updated_at DESC, a.created_at DESC`,
      [req.user.role, req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createApproval(req, res) {
  const { documentId, requestedByUserId, reviewerUserId, dueDate, notes } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: 'documentId is required' });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const documentResult = await client.query(
        `SELECT d.id, d.status, d.uploaded_by_user_id, u.role AS uploaded_by_role
         FROM documents d
         LEFT JOIN users u ON u.id = d.uploaded_by_user_id
         WHERE d.id = $1`,
        [documentId]
      );

      if (documentResult.rowCount === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const existingPending = await client.query(
        `SELECT id FROM approvals WHERE document_id = $1 AND status = 'pending'`,
        [documentId]
      );

      if (existingPending.rowCount > 0) {
        return res.status(409).json({ error: 'Approval workflow already exists for this document' });
      }

      const initialStage = documentResult.rows[0].status === DOCUMENT_STATUS.WAIT_FOR_FINALIZATION
        ? APPROVAL_STAGE.MANAGER
        : getInitialApprovalStage(documentResult.rows[0].uploaded_by_role);

      const result = await client.query(
        `INSERT INTO approvals
         (document_id, requested_by_user_id, reviewer_user_id, stage, status, due_date, notes)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6)
         RETURNING *`,
        [documentId, requestedByUserId || req.user.id, reviewerUserId || null, initialStage, dueDate || null, notes || null]
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
    const approval = await pool.query(
      `SELECT a.id, a.document_id, a.stage, a.requested_by_user_id, d.uploaded_by_user_id, u.role AS uploaded_by_role
       FROM approvals a
       INNER JOIN documents d ON d.id = a.document_id
       LEFT JOIN users u ON u.id = d.uploaded_by_user_id
       WHERE a.id = $1`,
      [id]
    );

    if (approval.rowCount === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approverRole = getApproverRoleForStage(approval.rows[0].stage);
    const canApprove = req.user.role === 'admin' || req.user.role === approverRole;

    if (!canApprove) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nextDocumentStatus = status === 'approved'
        ? getDocumentStatusForStage(approval.rows[0].stage)
        : DOCUMENT_STATUS.REJECTED;

      const result = await client.query(
        `UPDATE approvals
         SET status = $1,
             notes = COALESCE($2, notes),
             reviewer_user_id = COALESCE($3, reviewer_user_id),
             decision_by_user_id = $4,
             decision_at = NOW(),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [status, notes || null, reviewerUserId || req.user.id, req.user.id, id]
      );

      await client.query(
        `UPDATE documents
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [nextDocumentStatus, approval.rows[0].document_id]
      );

      if (status === 'approved' && approval.rows[0].stage === APPROVAL_STAGE.SUPERVISOR) {
        await client.query(
          `INSERT INTO approvals
           (document_id, requested_by_user_id, stage, status, notes)
           VALUES ($1, $2, $3, 'pending', $4)`,
          [
            approval.rows[0].document_id,
            approval.rows[0].requested_by_user_id,
            getNextApprovalStage(approval.rows[0].stage),
            'Auto-created manager finalization after supervisor approval',
          ]
        );
      }

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
