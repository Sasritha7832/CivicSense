const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

const pwRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
];

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('ward').optional().trim(),
  ...pwRules,
  validate
], ctrl.register);

router.post('/verify-otp', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('otp').notEmpty().withMessage('OTP is required'),
  validate
], ctrl.verifyOTP);

router.post('/resend-otp', [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  validate
], ctrl.resendOTP);

router.post('/login', [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], ctrl.login);

router.post('/forgot-password', [
  body('email').isEmail().withMessage('Invalid email'),
  validate
], ctrl.forgotPassword);

router.patch('/reset-password', [
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('otp').notEmpty().withMessage('OTP is required'),
  ...pwRules,
  validate
], ctrl.resetPassword);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', verifyToken, ctrl.getMe);

module.exports = router;
