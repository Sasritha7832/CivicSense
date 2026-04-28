const Issue = require('../models/Issue');
const { getIO } = require('../config/socket');
const { createRedisClient } = require('../config/redis');
const { getQueue } = require('../utils/queueFallback');
const AuditLog = require('../models/AuditLog');

const redisClient = createRedisClient();
const imageQueue = getQueue('image-compression', { connection: redisClient });

// GET /api/officer/assigned
const getAssigned = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = { assignedTo: req.user._id, isDeleted: false };
  if (status && status !== 'all') {
    const statusMap = {
      'open': 'Open',
      'in_progress': 'InProgress',
      'resolved': 'Resolved',
      'rejected': 'Rejected',
      'InProgress': 'InProgress',
      'Resolved': 'Resolved',
      'Open': 'Open',
      'Rejected': 'Rejected'
    };
    query.status = statusMap[status] || status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [issues, total] = await Promise.all([
    Issue.find(query).sort({ slaDeadline: 1, createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('category', 'name icon color').populate('createdBy', 'name'),
    Issue.countDocuments(query),
  ]);

  res.json({ issues, pagination: { total, page: parseInt(page), pages: Math.ceil(total / (parseInt(limit) || 20)) || 1 } });
};

// PATCH /api/officer/issues/:id/status
const officerUpdateStatus = async (req, res) => {
  const { status, notes } = req.body;
  const statusMap = {
    'in_progress': 'InProgress',
    'resolved': 'Resolved',
    'InProgress': 'InProgress',
    'Resolved': 'Resolved'
  };

  const mappedStatus = statusMap[status];
  if (!mappedStatus) {
    return res.status(400).json({ error: 'Officers can only set InProgress or Resolved' });
  }

  const issue = await Issue.findOne({ _id: req.params.id, assignedTo: req.user._id });
  if (!issue) return res.status(404).json({ error: 'Issue not found or not assigned to you' });

  const oldStatus = issue.status;
  issue.status = mappedStatus;
  if (mappedStatus === 'Resolved') {
    issue.resolvedAt = new Date();
  } else {
    issue.resolvedAt = null;
  }

  // Upload proof images if provided
  if (req.files?.length) {
    for (const file of req.files) {
      const filename = `proof-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      await imageQueue.add('compress', {
        buffer: file.buffer.toString('base64'),
        filename,
        issueId: issue._id
      });
    }
  }

  await issue.save();

  await AuditLog.create({
    adminId: req.user._id,
    action: 'STATUS_CHANGE',
    issueId: issue._id,
    field: 'status',
    oldValue: oldStatus,
    newValue: mappedStatus
  });

  const io = getIO();
  if (io) {
    io.to(`user:${issue.createdBy}`).emit('notification:push', {
      title: 'Status Updated',
      message: `Your reported issue "${issue.title}" is now ${mappedStatus}`,
      issueId: issue._id
    });
    io.to(`issue-${issue._id}`).emit('issue:status_changed', { issueId: issue._id, status: mappedStatus });
    io.to('room:admin').emit('issue:status_changed', { issueId: issue._id, status: mappedStatus });
  }

  res.json({ message: 'Status updated', issue });
};

module.exports = { getAssigned, officerUpdateStatus };
