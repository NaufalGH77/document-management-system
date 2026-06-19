const pool = require('../config/db');

const parseDocument = (row) => ({
  id: row.id,
  title: row.title,
  folder: row.folder_name,
  owner: row.owner_name,
  status: row.status,
  updatedAt: row.updated_at,
  fileType: row.file_type,
  version: row.current_version,
  summary: row.summary,
  fileName: row.file_name,
  fileSizeBytes: row.file_size_bytes,
});

async function listDocuments(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         d.id,
         d.title,
         d.summary,
         d.file_name,
         d.file_type,
         d.file_size_bytes,
         d.status,
         d.current_version,
         d.updated_at,
         COALESCE(f.name, 'Unfiled') AS folder_name,
         COALESCE(u.full_name, 'Unassigned') AS owner_name
       FROM documents d
       LEFT JOIN folders f ON f.id = d.folder_id
       LEFT JOIN users u ON u.id = d.owner_user_id
       ORDER BY d.updated_at DESC, d.created_at DESC`
    );

    res.json(result.rows.map(parseDocument));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getDocumentById(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         d.id,
         d.title,
         d.summary,
         d.file_name,
         d.file_type,
         d.file_size_bytes,
         d.status,
         d.current_version,
         d.updated_at,
         COALESCE(f.name, 'Unfiled') AS folder_name,
         COALESCE(u.full_name, 'Unassigned') AS owner_name,
         u.department AS owner_department
       FROM documents d
       LEFT JOIN folders f ON f.id = d.folder_id
       LEFT JOIN users u ON u.id = d.owner_user_id
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createDocument(req, res) {
  const {
    folderId,
    ownerUserId,
    title,
    summary,
    fileName,
    fileType,
    fileSizeBytes,
    status = 'draft',
    currentVersion = 'v1.0',
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO documents
       (folder_id, owner_user_id, title, summary, file_name, file_type, file_size_bytes, status, current_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [folderId || null, ownerUserId || null, title, summary || null, fileName, fileType, fileSizeBytes || null, status, currentVersion]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listDocuments,
  getDocumentById,
  createDocument,
};
