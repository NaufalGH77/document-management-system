const express = require('express');
const { createDocument, deleteDocument, getDocumentById, listDocuments, updateDocument } = require('../controllers/documentController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../config/upload');

const router = express.Router();

router.use(authenticate);
router.get('/', listDocuments);
router.get('/:id', getDocumentById);
router.post('/', upload.single('file'), createDocument);
router.patch('/:id', upload.single('file'), updateDocument);
router.delete('/:id', requireRole('admin', 'editor'), deleteDocument);

module.exports = router;
