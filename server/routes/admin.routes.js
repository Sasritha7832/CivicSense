const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');
const catCtrl = require('../controllers/categories.controller');

router.use(verifyToken, requireRole('admin'));

router.get('/stats', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate
], ctrl.getAdminStats);
router.get('/audit-log', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('adminId').optional().isMongoId(),
  query('actionType').optional().isString(),
  validate
], ctrl.getAuditLog);

router.get('/officers', [
  query('department').optional().isString(),
  query('ward').optional().isString(),
  validate
], ctrl.getOfficers);

router.post('/assign', [
  body('issueId').isMongoId().withMessage('Invalid issue ID'),
  body('officerId').isMongoId().withMessage('Invalid officer ID'),
  validate
], ctrl.assignIssue);

router.patch('/issues/bulk-status', [
  body('ids').isArray().withMessage('IDs must be an array'),
  body('ids.*').isMongoId().withMessage('Invalid issue ID in array'),
  body('status').isIn(['Open', 'InProgress', 'Resolved', 'Rejected']).withMessage('Invalid status'),
  validate
], ctrl.bulkUpdateStatus);

// Category management (admin only)
router.get('/categories', catCtrl.getCategories);

router.post('/categories', [
  body('name').notEmpty().withMessage('Name is required'),
  body('icon').notEmpty().withMessage('Icon is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('color').notEmpty().withMessage('Color is required'),
  body('defaultSlaHours').isInt({ min: 1 }).withMessage('Default SLA hours must be a positive integer'),
  validate
], catCtrl.createCategory);

router.patch('/categories/:id', [
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('name').optional().notEmpty(),
  body('defaultSlaHours').optional().isInt({ min: 1 }),
  validate
], catCtrl.updateCategory);

router.delete('/categories/:id', [
  param('id').isMongoId().withMessage('Invalid category ID'),
  validate
], catCtrl.deleteCategory);

module.exports = router;
