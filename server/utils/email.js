const nodemailer = require('nodemailer');

// Initialize Nodemailer transport using Gmail
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

const brand = `
  <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f8fafc;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🏙️ CivicPulse</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Community Issue Tracker</p>
    </div>
    <div style="padding:32px;">
`;

const brandClose = `
    </div>
    <div style="background:#1e293b;padding:16px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#64748b;">You received this because you have a CivicPulse account. <a href="${process.env.FRONTEND_URL}" style="color:#3b82f6;">Visit CivicPulse</a></p>
    </div>
  </div>
`;

/**
 * Sends the 6-digit OTP for new user registration verification
 */
const sendOTPEmail = async (to, otp) => {
  if (!transporter) {
    console.warn(`[Mock Email] Would have sent OTP ${otp} to ${to}. SMTP not configured.`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject: 'Verify your CivicPulse account — OTP inside',
      html: `${brand}
        <h2 style="color:#f8fafc;font-size:20px;margin:0 0 12px;">Email Verification</h2>
        <p style="color:#94a3b8;margin:0 0 24px;">Enter this 6-digit code to verify your email. It expires in 10 minutes.</p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#3b82f6;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0;">If you didn't create an account, ignore this email.</p>
      ${brandClose}`,
    });
    return info;
  } catch (err) {
    console.error('❌ Failed to send verification email:', err.message);
  }
};

/**
 * Sends the 6-digit OTP for resetting a forgotten password
 */
const sendResetOTP = async (to, otp) => {
  if (!transporter) return;
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject: 'Reset your CivicPulse password — OTP inside',
      html: `${brand}
        <h2 style="color:#f8fafc;font-size:20px;margin:0 0 12px;">Password Reset Request</h2>
        <p style="color:#94a3b8;margin:0 0 24px;">We received a request to reset your password. Enter this 6-digit code on the reset page. It expires in 10 minutes.</p>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#f59e0b;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0;">If you didn't request a password reset, you can safely ignore this email.</p>
      ${brandClose}`,
    });
    return info;
  } catch (err) {
    console.error('❌ Failed to send password reset email:', err.message);
  }
};

/**
 * Sends a welcome email immediately after successful OTP verification
 */
const sendWelcomeEmail = async (to, name) => {
  if (!transporter) return;
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject: 'Welcome to CivicPulse!',
      html: `${brand}
        <h2 style="color:#f8fafc;font-size:20px;margin:0 0 12px;">Welcome, ${name}! 🎉</h2>
        <p style="color:#94a3b8;margin:0 0 24px;">Your email has been successfully verified. You can now start reporting and tracking civic issues in your community.</p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${process.env.FRONTEND_URL}/report" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Submit a Report</a>
        </div>
      ${brandClose}`,
    });
    return info;
  } catch (err) {
    console.error('❌ Failed to send welcome email:', err.message);
  }
};

const sendStatusUpdateEmail = async (to, issue, newStatus) => {
  if (!transporter) return;
  const statusColors = { open:'#ef4444', in_progress:'#f59e0b', resolved:'#22c55e', rejected:'#6b7280' };
  const color = statusColors[newStatus] || '#3b82f6';
  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject: `Your issue "${issue.title}" — status updated`,
      html: `${brand}
        <h2 style="color:#f8fafc;font-size:20px;margin:0 0 12px;">Issue Status Updated</h2>
        <div style="background:#1e293b;border-left:4px solid ${color};border-radius:8px;padding:16px;margin:0 0 20px;">
          <p style="margin:0 0 4px;font-weight:600;color:#f8fafc;">${issue.title}</p>
          <p style="margin:0;color:${color};text-transform:uppercase;font-size:13px;font-weight:700;">${newStatus.replace('_',' ')}</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/issues/${issue._id}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">View Issue</a>
      ${brandClose}`,
    });
  } catch (err) {}
};

const sendAssignmentEmail = async (to, issue, slaDeadline) => {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject: `New assignment: "${issue.title}"`,
      html: `${brand}
        <h2 style="color:#f8fafc;font-size:20px;margin:0 0 12px;">New Issue Assigned to You</h2>
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin:0 0 20px;">
          <p style="margin:0 0 4px;font-weight:600;color:#f8fafc;">${issue.title}</p>
          <p style="margin:0;color:#94a3b8;font-size:13px;">SLA Deadline: <strong style="color:#f59e0b;">${new Date(slaDeadline).toLocaleString()}</strong></p>
        </div>
        <a href="${process.env.FRONTEND_URL}/officer" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">View My Assignments</a>
      ${brandClose}`,
    });
  } catch (err) {}
};

module.exports = {
  sendOTPEmail,
  sendResetOTP,
  sendWelcomeEmail,
  sendStatusUpdateEmail,
  sendAssignmentEmail
};
