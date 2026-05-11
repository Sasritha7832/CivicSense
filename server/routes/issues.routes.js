const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, optionalAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/issues.controller');
const rateLimit = require('express-rate-limit');

const createIssueLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // limit to 5 requests per windowMs
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : req.ip;
  },
  message: { error: 'You have reached the limit of 5 reports per day. Please try again tomorrow.' }
});

// Serve local uploads
const path = require('path');

router.get('/export/csv', verifyToken, requireRole('admin'), ctrl.exportCSV);
router.get('/export/pdf', verifyToken, requireRole('admin'), ctrl.exportPDF);
router.get('/user/me', verifyToken, ctrl.getMyIssues);

router.get('/', [
  optionalAuth,
  query('status').optional().isString(),
  query('category').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  validate
], ctrl.getIssues);

router.post('/', [
  verifyToken,
  createIssueLimiter,
  upload.array('images', 5),
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('lat').isFloat().withMessage('Latitude must be a number'),
  body('lng').isFloat().withMessage('Longitude must be a number'),
  body('address').notEmpty().withMessage('Address is required'),
  body('ward').optional().trim(),
  validate
], ctrl.createIssue);

router.get('/:id', [
  optionalAuth,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  validate
], ctrl.getIssueById);

router.put('/:id', [
  verifyToken,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  body('title').optional().isLength({ max: 200 }),
  body('description').optional(),
  body('category').optional().isMongoId(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  validate
], ctrl.editIssue);

router.patch('/:id/status', [
  verifyToken,
  requireRole('admin', 'officer'),
  param('id').isMongoId().withMessage('Invalid issue ID'),
  body('status').isIn(['Open', 'InProgress', 'Resolved', 'Rejected']).withMessage('Invalid status'),
  validate
], ctrl.updateIssueStatus);

router.post('/:id/upvote', [
  verifyToken,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  validate
], ctrl.toggleUpvote);

router.post('/:id/proof', [
  verifyToken,
  requireRole('officer', 'admin'),
  upload.array('images', 5),
  param('id').isMongoId().withMessage('Invalid issue ID'),
  validate
], ctrl.uploadProof);

router.delete('/:id', [
  verifyToken,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  validate
], ctrl.deleteIssue);

router.post('/:id/rate', [
  verifyToken,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isString().isLength({ max: 500 }),
  validate
], ctrl.rateIssue);

router.get('/:id/comments', [
  optionalAuth,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  validate
], ctrl.getComments);

router.post('/:id/comments', [
  verifyToken,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  body('body').notEmpty().withMessage('Comment body is required'),
  validate
], ctrl.addComment);

router.post('/:id/comments/:commentId/reply', [
  verifyToken,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  param('commentId').isMongoId().withMessage('Invalid comment ID'),
  body('body').notEmpty().withMessage('Reply body is required'),
  validate
], ctrl.replyToComment);

router.delete('/:id/comments/:commentId', [
  verifyToken,
  param('id').isMongoId().withMessage('Invalid issue ID'),
  param('commentId').isMongoId().withMessage('Invalid comment ID'),
  validate
], ctrl.deleteComment);

module.exports = router;
