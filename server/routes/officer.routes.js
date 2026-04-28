const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/officer.controller');

router.use(verifyToken, requireRole('officer', 'admin'));

router.get('/assigned', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['all', 'Open', 'InProgress', 'Resolved', 'Closed']),
  validate
], ctrl.getAssigned);

router.patch('/issues/:id/status', [
  param('id').isMongoId().withMessage('Invalid issue ID'),
  upload.array('proofImages', 5),
  body('status').isIn(['InProgress', 'Resolved']).withMessage('Invalid status'),
  validate
], ctrl.officerUpdateStatus);

module.exports = router;
