const express = require('express');
const { createApproval, listApprovals } = require('../controllers/approvalController');

const router = express.Router();

router.get('/', listApprovals);
router.post('/', createApproval);

module.exports = router;
