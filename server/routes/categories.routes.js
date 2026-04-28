const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categories.controller');
router.get('/', ctrl.getCategories);
module.exports = router;
