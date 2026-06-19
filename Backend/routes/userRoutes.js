const express = require('express');
const {
	createUser,
	deleteUser,
	getCurrentUser,
	getUserById,
	listUsers,
	updateCurrentUser,
	updateUser,
} = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/me', getCurrentUser);
router.patch('/me', updateCurrentUser);
router.get('/', requireRole('admin'), listUsers);
router.post('/', requireRole('admin'), createUser);
router.get('/:id', requireRole('admin'), getUserById);
router.patch('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
