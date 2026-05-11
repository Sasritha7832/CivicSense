const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/announcements.controller');

router.get('/', ctrl.getActiveAnnouncements);

router.post('/', [
  verifyToken,
  requireRole('admin'),
  body('title').isString().notEmpty().isLength({ max: 100 }),
  body('message').isString().notEmpty().isLength({ max: 500 }),
  body('ward').optional().isString(),
  validate
], ctrl.createAnnouncement);

router.delete('/:id', [
  verifyToken,
  requireRole('admin')
], ctrl.deleteAnnouncement);

module.exports = router;
