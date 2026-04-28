const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/notifications.controller');

router.use(verifyToken);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate
], ctrl.getNotifications);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', [
  param('id').isMongoId().withMessage('Invalid notification ID'),
  validate
], ctrl.markRead);

module.exports = router;
