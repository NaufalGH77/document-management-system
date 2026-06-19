const express = require('express');
const { createUser, listUsers } = require('../controllers/userController');

const router = express.Router();

router.get('/', listUsers);
router.post('/', createUser);

module.exports = router;
