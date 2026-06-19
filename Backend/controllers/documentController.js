const pool = require('../config/db');
const { nextVersionLabel } = require('../utils/security');

function buildFileUrl(filePath) {
  return filePath ? `/uploads/${filePath.replace(/\\/g, '/')}` : null;
}

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
  originalFileName: row.original_file_name,
  fileUrl: buildFileUrl(row.file_path),
  fileSizeBytes: row.file_size_bytes,
  uploadedBy: row.uploaded_by_name,
});

async function listDocuments(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         d.id,
         d.title,
         d.summary,
         d.file_name,
         d.original_file_name,
         d.file_path,
         d.file_type,
         d.file_size_bytes,
         d.status,
         d.current_version,
         d.updated_at,
         COALESCE(f.name, 'Unfiled') AS folder_name,
         COALESCE(u.full_name, 'Unassigned') AS owner_name,
         COALESCE(up.full_name, 'Unassigned') AS uploaded_by_name
       FROM documents d
       LEFT JOIN folders f ON f.id = d.folder_id
       LEFT JOIN users u ON u.id = d.owner_user_id
       LEFT JOIN users up ON up.id = d.uploaded_by_user_id
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
         d.original_file_name,
         d.file_path,
         d.file_type,
         d.file_size_bytes,
         d.status,
         d.current_version,
         d.updated_at,
         COALESCE(f.name, 'Unfiled') AS folder_name,
         COALESCE(u.full_name, 'Unassigned') AS owner_name,
         u.department AS owner_department,
         COALESCE(up.full_name, 'Unassigned') AS uploaded_by_name
       FROM documents d
       LEFT JOIN folders f ON f.id = d.folder_id
       LEFT JOIN users u ON u.id = d.owner_user_id
       LEFT JOIN users up ON up.id = d.uploaded_by_user_id
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const versionsResult = await pool.query(
      `SELECT
         dv.id,
         dv.version_label,
         dv.file_name,
         dv.file_size_bytes,
         dv.change_note,
         dv.created_at,
         COALESCE(u.full_name, 'Unassigned') AS created_by_name
       FROM document_versions dv
       LEFT JOIN users u ON u.id = dv.created_by_user_id
       WHERE dv.document_id = $1
       ORDER BY dv.created_at DESC, dv.id DESC`,
      [req.params.id]
    );

    res.json({
      ...parseDocument(result.rows[0]),
      ownerDepartment: result.rows[0].owner_department,
      uploadedBy: result.rows[0].uploaded_by_name,
      versions: versionsResult.rows.map((version) => ({
        id: version.id,
        versionLabel: version.version_label,
        fileName: version.file_name,
        fileSizeBytes: version.file_size_bytes,
        changeNote: version.change_note,
        createdAt: version.created_at,
        createdBy: version.created_by_name,
      })),
    });
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
    filePath,
    originalFileName,
    changeNote,
    status = 'draft',
    currentVersion = 'v1.0',
  } = req.body;

  const storedFileName = req.file ? req.file.filename : fileName;
  const storedFileType = req.file ? req.file.mimetype : fileType;
  const storedFileSize = req.file ? req.file.size : fileSizeBytes || null;
  const storedOriginalFileName = req.file ? req.file.originalname : originalFileName || fileName;
  const storedFilePath = req.file ? `documents/${req.file.filename}` : filePath || null;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  if (!storedFileName || !storedOriginalFileName || !storedFilePath || !storedFileType) {
    return res.status(400).json({ error: 'file is required' });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO documents
         (folder_id, owner_user_id, uploaded_by_user_id, title, summary, file_name, original_file_name, file_path, file_type, file_size_bytes, status, current_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          folderId || null,
          ownerUserId || req.user.id,
          req.user.id,
          title,
          summary || null,
          storedFileName,
          storedOriginalFileName,
          storedFilePath,
          storedFileType,
          storedFileSize,
          status,
          currentVersion,
        ]
      );

      await client.query(
        `INSERT INTO document_versions
         (document_id, version_label, file_name, file_size_bytes, change_note, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          result.rows[0].id,
          currentVersion,
          storedFileName,
          storedFileSize,
          changeNote || 'Initial upload',
          req.user.id,
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        id: result.rows[0].id,
        title: result.rows[0].title,
        summary: result.rows[0].summary,
        status: result.rows[0].status,
        version: result.rows[0].current_version,
        fileUrl: buildFileUrl(result.rows[0].file_path),
      });
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

async function updateDocument(req, res) {
  const { id } = req.params;
  const { folderId, ownerUserId, title, summary, status, changeNote } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const currentDocument = existing.rows[0];
    const canManageAllDocuments = ['admin', 'editor'].includes(req.user.role);
    const isDocumentOwner = req.user.id === currentDocument.owner_user_id || req.user.id === currentDocument.uploaded_by_user_id;

    if (!canManageAllDocuments && !isDocumentOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = [];
    const values = [];
    let index = 1;

    if (folderId !== undefined) {
      updates.push(`folder_id = $${index}`);
      values.push(folderId || null);
      index += 1;
    }

    if (ownerUserId !== undefined) {
      updates.push(`owner_user_id = $${index}`);
      values.push(ownerUserId || null);
      index += 1;
    }

    if (title) {
      updates.push(`title = $${index}`);
      values.push(title);
      index += 1;
    }

    if (summary !== undefined) {
      updates.push(`summary = $${index}`);
      values.push(summary || null);
      index += 1;
    }

    if (status) {
      updates.push(`status = $${index}`);
      values.push(status);
      index += 1;
    }

    let versionLabel = currentDocument.current_version;
    let fileName = currentDocument.file_name;
    let originalFileName = currentDocument.original_file_name;
    let filePath = currentDocument.file_path;
    let fileType = currentDocument.file_type;
    let fileSizeBytes = currentDocument.file_size_bytes;

    if (req.file) {
      versionLabel = nextVersionLabel(currentDocument.current_version);
      fileName = req.file.filename;
      originalFileName = req.file.originalname;
      filePath = `documents/${req.file.filename}`;
      fileType = req.file.mimetype;
      fileSizeBytes = req.file.size;

      updates.push(`current_version = $${index}`);
      values.push(versionLabel);
      index += 1;
      updates.push(`file_name = $${index}`);
      values.push(fileName);
      index += 1;
      updates.push(`original_file_name = $${index}`);
      values.push(originalFileName);
      index += 1;
      updates.push(`file_path = $${index}`);
      values.push(filePath);
      index += 1;
      updates.push(`file_type = $${index}`);
      values.push(fileType);
      index += 1;
      updates.push(`file_size_bytes = $${index}`);
      values.push(fileSizeBytes);
      index += 1;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE documents
         SET ${updates.join(', ')}
         WHERE id = $${index}
         RETURNING *`,
        values
      );

      if (req.file) {
        await client.query(
          `INSERT INTO document_versions
           (document_id, version_label, file_name, file_size_bytes, change_note, created_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            result.rows[0].id,
            versionLabel,
            fileName,
            fileSizeBytes,
            changeNote || 'Document updated',
            req.user.id,
          ]
        );
      }

      await client.query('COMMIT');

      res.json({
        id: result.rows[0].id,
        title: result.rows[0].title,
        summary: result.rows[0].summary,
        status: result.rows[0].status,
        version: result.rows[0].current_version,
        fileUrl: buildFileUrl(result.rows[0].file_path),
      });
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

async function deleteDocument(req, res) {
  try {
    const existing = await pool.query('SELECT id, owner_user_id, uploaded_by_user_id FROM documents WHERE id = $1', [req.params.id]);

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const canManageAllDocuments = ['admin', 'editor'].includes(req.user.role);
    const isDocumentOwner = req.user.id === existing.rows[0].owner_user_id || req.user.id === existing.rows[0].uploaded_by_user_id;

    if (!canManageAllDocuments && !isDocumentOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createDocument,
  deleteDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
};
