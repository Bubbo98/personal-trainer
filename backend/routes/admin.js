const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// /api/admin — every route is admin-only
const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.use(require('./admin/users'));
router.use(require('./admin/videos'));
router.use(require('./admin/reviews'));

module.exports = router;
