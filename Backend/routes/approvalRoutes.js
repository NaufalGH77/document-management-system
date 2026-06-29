const express = require('express');
const { createApproval, listApprovals, updateApproval } = require('../controllers/approvalController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', listApprovals);
router.post('/', createApproval);
router.patch('/:id', requireRole('supervisor', 'manager', 'reviewer', 'admin'), updateApproval);

module.exports = router;
