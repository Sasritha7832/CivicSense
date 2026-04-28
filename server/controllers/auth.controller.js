const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const {
  generateAccessToken, generateRefreshToken, generateOTP,
  hashToken, setRefreshCookie, clearRefreshCookie
} = require('../utils/jwt');
const { sendOTPEmail, sendResetOTP, sendWelcomeEmail } = require('../utils/email');

// POST /api/auth/register
const register = async (req, res) => {
  const { name, email, password, ward } = req.body;

  // Domain validation
  if (process.env.ALLOWED_EMAIL_DOMAINS) {
    const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS.split(',').map(d => d.trim().toLowerCase());
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!allowedDomains.includes(emailDomain)) {
      return res.status(400).json({ error: `Registration is only allowed for the following domains: ${allowedDomains.join(', ')}` });
    }
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({ name, email, passwordHash, ward: ward || '', otp, otpExpiry });

  // Log OTP to console for easy testing locally
  console.log(`\n=========================================`);
  console.log(`🔑 NEW REGISTRATION OTP: ${otp}`);
  console.log(`📧 Sent to: ${email}`);
  console.log(`=========================================\n`);

  await sendOTPEmail(email, otp);

  res.status(201).json({ message: 'Registration successful. Check your email for the OTP.', userId: user._id });
};

// POST /api/auth/resend-otp
const resendOTP = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  console.log(`\n=========================================`);
  console.log(`🔄 RESEND REGISTRATION OTP: ${otp}`);
  console.log(`📧 Sent to: ${email}`);
  console.log(`=========================================\n`);

  await sendOTPEmail(email, otp);

  res.json({ message: 'A new OTP has been sent to your email.' });
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });
  if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  await sendWelcomeEmail(user.email, user.name);

  // Issue tokens immediately after verification
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.json({ message: 'Email verified!', accessToken, user: user.toSafeObject() });
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email first', userId: user._id });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user: user.toSafeObject() });
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh token required' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const tokenHash = hashToken(token);
  if (user.refreshTokenHash !== tokenHash) {
    return res.status(401).json({ error: 'Token reuse detected. Please log in again.' });
  }

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken });
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.id, { refreshTokenHash: null });
    } catch {}
  }
  clearRefreshCookie(res);
  res.json({ message: 'Logged out successfully' });
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ message: 'If that email exists, a reset OTP has been sent.' });

  const otp = generateOTP();
  user.resetToken = hashToken(otp); // Securely store hashed OTP in resetToken field
  user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
  await user.save();

  console.log(`\n=========================================`);
  console.log(`🔑 PASSWORD RESET OTP: ${otp}`);
  console.log(`📧 Sent to: ${email}`);
  console.log(`=========================================\n`);

  await sendResetOTP(email, otp);

  res.json({ message: 'If that email exists, a reset OTP has been sent.' });
};

// PATCH /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ error: 'Email, OTP, and new password are required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset OTP' });

  const hashedOTP = hashToken(otp);
  if (user.resetToken !== hashedOTP || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset OTP' });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  user.refreshTokenHash = null; // Invalidate all existing sessions
  await user.save();

  clearRefreshCookie(res);
  res.json({ message: 'Password reset successful. Please log in with your new password.' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
};

module.exports = { register, resendOTP, verifyOTP, login, refresh, logout, forgotPassword, resetPassword, getMe };
