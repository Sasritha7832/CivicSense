const Issue = require('../models/Issue');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Category = require('../models/Category');
const bcrypt = require('bcryptjs');
const { getIO } = require('../config/socket');
const { sendStatusUpdateEmail, sendAssignmentEmail } = require('../utils/email');

// GET /api/admin/stats
const getAdminStats = async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  const [
    totalIssues,
    openIssues,
    resolvedToday,
    slaBreachedCount,
    avgResolutionData,
    byCategory,
    byStatus,
    communityPressure
  ] = await Promise.all([
    Issue.countDocuments({ isDeleted: false }),
    Issue.countDocuments({ status: 'Open', isDeleted: false }),
    Issue.countDocuments({ status: 'Resolved', updatedAt: { $gte: todayStart }, isDeleted: false }),
    Issue.countDocuments({ slaBreached: true, isDeleted: false }),
    Issue.aggregate([
      { $match: { status: 'Resolved', isDeleted: false } },
      { $group: { _id: null, avgDays: { $avg: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] } } } }
    ]),
    Issue.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      { $group: { _id: '$cat.name', count: { $sum: 1 } } }
    ]),
    Issue.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Issue.aggregate([
      { $match: { isDeleted: false, status: { $ne: 'Resolved' } } },
      { $addFields: { upvotesCount: { $size: '$upvotes' } } },
      { $sort: { upvotesCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmpty: true } },
      { $project: { title: 1, status: 1, category: { $ifNull: ['$cat.name', 'Unknown'] }, upvotesCount: 1, createdAt: 1 } },
    ]),
  ]);

  res.json({
    stats: {
      totalIssues,
      openIssues,
      resolvedToday,
      avgResolutionTime: avgResolutionData[0]?.avgDays || 0,
      slaBreachedCount
    },
    charts: {
      byCategory: byCategory.map(c => ({ name: c._id, value: c.count })),
      byStatus: byStatus.map(s => ({ name: s._id, value: s.count }))
    },
    communityPressure
  });
};

// GET /api/admin/audit-log
const getAuditLog = async (req, res) => {
  const { adminId, actionType, startDate, endDate, page = 1, limit = 20 } = req.query;
  const query = {};

  if (adminId) query.adminId = adminId;
  if (actionType) query.action = actionType;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(query)
    .populate('adminId', 'name')
    .populate('issueId', 'title')
    .select('adminId issueId action timestamp field newValue')
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await AuditLog.countDocuments(query);

  res.json({ logs, total, page, pages: Math.ceil(total / (parseInt(limit) || 20)) || 1 });
};

// POST /api/admin/assign
const assignIssue = async (req, res) => {
  const { issueId, officerId, note } = req.body;
  const issue = await Issue.findById(issueId).select('title status assignedTo assignedAt').lean();
  const officer = await User.findById(officerId).select('name role').lean();

  if (!issue || !officer || officer.role !== 'officer') {
    return res.status(404).json({ message: 'Issue or Officer not found' });
  }

  const updatedIssue = await Issue.findByIdAndUpdate(issueId, {
    assignedTo: officerId,
    assignedAt: new Date(),
    status: 'InProgress'
  }, { new: true }).select('title status assignedTo assignedAt').lean();

  // Audit Log
  await AuditLog.create({
    adminId: req.user._id,
    action: 'ASSIGN',
    issueId: updatedIssue._id,
    field: 'assignedTo',
    newValue: officer.name
  });

  // Notification for officer
  const notification = await Notification.create({
    userId: officerId,
    type: 'assigned',
    message: `New issue assigned to you: "${updatedIssue.title}". ${note || ''}`,
    issueId: updatedIssue._id
  });

  // Also need email and slaDeadline for the email - fetch full officer and issue
  const officerFull = await User.findById(officerId).select('email name').lean();
  const issueFull = await Issue.findById(issueId).select('slaDeadline title').lean();

  const io = getIO();
  if (io) {
    io.to(`user:${officerId}`).emit('issue:assigned', {
      issueId: updatedIssue._id,
      title: updatedIssue.title,
      notification
    });
  }

  // Send assignment email to officer
  if (officerFull?.email && issueFull) {
    sendAssignmentEmail(officerFull.email, issueFull, issueFull.slaDeadline).catch(err =>
      console.error('[assignIssue] Email error:', err.message)
    );
  }

  res.json({ message: 'Issue assigned successfully', issue: updatedIssue });
};

// PATCH /api/admin/issues/bulk-status
const bulkUpdateStatus = async (req, res) => {
  const { ids, status } = req.body;
  if (!ids || !ids.length || !status) return res.status(400).json({ message: 'IDs and status required' });

  await Issue.updateMany(
    { _id: { $in: ids } },
    { $set: { status: status } }
  );

  // Log bulk action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'BULK_STATUS_UPDATE',
    newValue: { status, count: ids.length }
  });

  res.json({ message: `Updated ${ids.length} issues to ${status}` });
};

// GET /api/admin/officers
const getOfficers = async (req, res) => {
  const officers = await User.find({ role: 'officer' })
    .select('name email ward department')
    .lean();
  res.json({ officers });
};

// POST /api/admin/officers — Create a new officer account
const createOfficer = async (req, res) => {
  const { name, email, password, ward, department } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'An account with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const officer = await User.create({
    name,
    email,
    passwordHash,
    role: 'officer',
    ward,
    department,
    isVerified: true  // Admin-created officers are pre-verified
  });

  await AuditLog.create({
    adminId: req.user._id,
    action: 'CREATE_OFFICER',
    field: 'role',
    newValue: `${name} (${email}) assigned to ${ward}`
  });

  res.status(201).json({ 
    message: `Officer account created for ${name}`,
    officer: { _id: officer._id, name: officer.name, email: officer.email, ward: officer.ward, department: officer.department }
  });
};

// DELETE /api/admin/officers/:id — Remove officer (demote to citizen)
const removeOfficer = async (req, res) => {
  const officer = await User.findByIdAndUpdate(
    req.params.id,
    { role: 'citizen', ward: null, department: null },
    { new: true }
  );
  if (!officer) return res.status(404).json({ message: 'Officer not found' });

  await AuditLog.create({
    adminId: req.user._id,
    action: 'REMOVE_OFFICER',
    field: 'role',
    newValue: `${officer.name} demoted to citizen`
  });

  res.json({ message: `${officer.name} has been removed as an officer.` });
};

module.exports = {
  getAdminStats,
  getAuditLog,
  assignIssue,
  bulkUpdateStatus,
  getOfficers,
  createOfficer,
  removeOfficer
};
