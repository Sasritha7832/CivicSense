const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/stats.controller');

router.get('/public', [
  query('ward').optional().trim(),
  validate
], ctrl.getPublicStats);

router.get('/leaderboard', ctrl.getLeaderboard);

module.exports = router;
