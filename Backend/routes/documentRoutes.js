const express = require('express');
const { createDocument, getDocumentById, listDocuments } = require('../controllers/documentController');

const router = express.Router();

router.get('/', listDocuments);
router.get('/:id', getDocumentById);
router.post('/', createDocument);

module.exports = router;
