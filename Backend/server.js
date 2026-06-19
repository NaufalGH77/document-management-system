const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const documentRoutes = require('./routes/documentRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Backend and database connected', time: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const [documentsResult, approvalsResult, usersResult, foldersResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM documents'),
      pool.query("SELECT COUNT(*)::int AS total FROM approvals WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*)::int AS total FROM users WHERE status = 'active'"),
      pool.query('SELECT COUNT(*)::int AS total FROM folders'),
    ]);

    res.json({
      activeDocuments: documentsResult.rows[0].total,
      pendingApprovals: approvalsResult.rows[0].total,
      activeUsers: usersResult.rows[0].total,
      folders: foldersResult.rows[0].total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/documents', documentRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});