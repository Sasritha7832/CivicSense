const path = require('path');
const fs = require('fs');
const Issue = require('../models/Issue');
const AuditLog = require('../models/AuditLog');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO } = require('../config/socket');
const checkUpvoteEscalation = require('../utils/upvoteEscalation');
const { createRedisClient } = require('../config/redis');
const { getQueue } = require('../utils/queueFallback');
const { generateIssuesCSV } = require('../utils/csv');
const { generateIssuesPDF } = require('../utils/pdf');
const { uploadMultipleImages } = require('../utils/cloudinary');
const { sendAssignmentEmail } = require('../utils/email');
const { checkAndAwardBadges } = require('../utils/gamification');

const redisClient = createRedisClient();
const imageQueue = getQueue('image-compression', { connection: redisClient });
const aiTriageQueue = getQueue('ai-triage', { connection: redisClient });

// GET /api/issues
const getIssues = async (req, res) => {
  const { status, category, ward, lat, lng, radius = 10, page = 1, limit = 20, sortBy = 'newest' } = req.query;
  const query = { isDeleted: false };

  if (status) {
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
  if (category) query.category = category;
  if (ward) query['location.ward'] = ward;

  if (lat && lng) {
    const r = parseFloat(radius) / 111.32; // Rough km to degrees
    query['location.lat'] = { $gte: parseFloat(lat) - r, $lte: parseFloat(lat) + r };
    query['location.lng'] = { $gte: parseFloat(lng) - r, $lte: parseFloat(lng) + r };
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    // upvotes: sort by array length requires aggregation — fallback to newest
    upvotes: { createdAt: -1 },
  };

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  // For upvotes sort, use aggregation to sort by actual array length
  let issues, total;
  if (sortBy === 'upvotes') {
    const agg = await Issue.aggregate([
      { $match: query },
      { $addFields: { upvotesCount: { $size: '$upvotes' } } },
      { $sort: { upvotesCount: -1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum }
    ]);
    total = await Issue.countDocuments(query);
    issues = await Issue.populate(agg, [
      { path: 'category', select: 'name icon color' },
      { path: 'createdBy', select: 'name' }
    ]);
  } else {
    [issues, total] = await Promise.all([
      Issue.find(query)
        .populate('category', 'name icon color')
        .populate('createdBy', 'name')
        .sort(sortOptions[sortBy] || { createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Issue.countDocuments(query),
    ]);
  }

  res.json({ issues, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 });
};

// POST /api/issues
const createIssue = async (req, res) => {
  const { title, description, category, priority, lat, lng, address, ward } = req.body;

  // Rate Limiting: Max 5 reports per user per day
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const userIssueCount = await Issue.countDocuments({
    createdBy: req.user._id,
    createdAt: { $gte: oneDayAgo }
  });

  if (userIssueCount >= 5) {
    return res.status(429).json({ error: 'Rate limit exceeded: Maximum 5 issues can be reported per day.' });
  }

  const cat = await Category.findById(category);
  if (!cat) return res.status(400).json({ message: 'Invalid category' });

  // Duplicate detection (200m radius = ~0.0018 degrees)
  const radiusDegrees = 0.2 / 111.32; 
  const duplicate = await Issue.findOne({
    'location.lat': { $gte: parseFloat(lat) - radiusDegrees, $lte: parseFloat(lat) + radiusDegrees },
    'location.lng': { $gte: parseFloat(lng) - radiusDegrees, $lte: parseFloat(lng) + radiusDegrees },
    status: { $in: ['Open', 'InProgress'] },
    category: cat._id
  });

  if (duplicate) {
    return res.status(409).json({ 
      error: 'A similar issue already exists within 200m.',
      duplicateId: duplicate._id 
    });
  }

  let assignedTo = null;
  let assignedAt = null;
  let status = 'Open';
  let officer = null;

  if (ward) {
    // Simple regex match for ward (e.g., 'Koramangala' matches 'Koramangala, Bangalore')
    officer = await User.findOne({ 
      role: 'officer', 
      ward: { $regex: new RegExp(ward, 'i') } 
    });
    if (officer) {
      assignedTo = officer._id;
      assignedAt = new Date();
      status = 'InProgress';
    }
  }

  const issue = await Issue.create({
    title,
    description,
    category,
    status,
    assignedTo,
    assignedAt,
    priority: priority ? (priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()) : 'Medium',
    location: { lat, lng, address, ward },
    createdBy: req.user._id,
    slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000) // Default 72h
  });

  if (officer) {
    sendAssignmentEmail(officer.email, issue, issue.slaDeadline).catch(err =>
      console.error('[createIssue] Auto-assign Email error:', err.message)
    );
    await Notification.create({
      userId: officer._id,
      type: 'assigned',
      message: `New issue automatically assigned to you: "${issue.title}".`,
      issueId: issue._id
    });
    const io = getIO();
    if (io) {
      io.to(`user:${officer._id}`).emit('issue:assigned', {
        issueId: issue._id,
        title: issue.title
      });
    }
  }

  // Gamification: +10 points for reporting
  await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });
  await checkAndAwardBadges(req.user._id);

  // Handle images via Cloudinary
  if (req.files && req.files.length > 0) {
    try {
      const imageUrls = await uploadMultipleImages(req.files);
      issue.images = imageUrls;
      await issue.save();
    } catch (err) {
      console.error('Cloudinary upload error:', err);
    }
  }

  // AI Triage
  await aiTriageQueue.add('triage', { issueId: issue._id });

  // Socket.IO
  const io = getIO();
  if (io) {
    io.to('room:admin').emit('issue:new', {
      id: issue._id,
      title: issue.title,
      status: issue.status
    });
  }

  res.status(201).json(issue);
};

// GET /api/issues/:id
const getIssueById = async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('category', 'name')
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .lean();

  if (!issue || issue.isDeleted) return res.status(404).json({ message: 'Issue not found' });
  res.json(issue);
};

// PUT /api/issues/:id
const editIssue = async (req, res) => {
  const { title, description, category, priority } = req.body;
  const issue = await Issue.findById(req.params.id);
  
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  // Only creator can edit
  if (issue.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to edit this issue' });
  }

  // Only open issues can be edited
  if (issue.status !== 'Open') {
    return res.status(400).json({ message: 'Can only edit Open issues' });
  }

  if (title) issue.title = title;
  if (description) issue.description = description;
  if (category) issue.category = category;
  if (priority) {
    issue.priority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  }

  await issue.save();
  res.json(issue);
};

// PATCH /api/issues/:id/status
const updateIssueStatus = async (req, res) => {
  const { status, rejectionReason, resolutionComment, internalNotes } = req.body;
  const issue = await Issue.findById(req.params.id);

  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  const oldStatus = issue.status;
  issue.status = status;
  
  if (rejectionReason) issue.rejectionReason = rejectionReason;
  if (resolutionComment) issue.resolutionComment = resolutionComment;
  if (internalNotes) issue.internalNotes = internalNotes;

  if (status === 'Resolved' && oldStatus !== 'Resolved') {
    issue.resolvedAt = new Date();
    // Gamification: +20 points for resolved issue
    await User.findByIdAndUpdate(issue.createdBy, { $inc: { points: 20 } });
    await checkAndAwardBadges(issue.createdBy);
  } else if (status !== 'Resolved') {
    issue.resolvedAt = null;
  }
  await issue.save();

  // Audit Log
  await AuditLog.create({
    adminId: req.user._id,
    action: 'STATUS_CHANGE',
    issueId: issue._id,
    field: 'status',
    oldValue: oldStatus,
    newValue: status
  });

  // Notify User
  const notification = await Notification.create({
    userId: issue.createdBy,
    type: 'status_change',
    message: `Issue "${issue.title}" status updated to ${status}`,
    issueId: issue._id
  });

  const io = getIO();
  if (io) {
    io.to(`user:${issue.createdBy}`).emit('notification:push', {
      title: 'Status Updated',
      message: notification.message,
      issueId: issue._id
    });
    io.to(`issue-${issue._id}`).emit('issue:status_changed', { issueId: issue._id, status });
  }

  res.json(issue);
};

// POST /api/issues/:id/upvote
const toggleUpvote = async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  const userId = req.user._id.toString();
  const upvoteIndex = issue.upvotes.findIndex(id => id.toString() === userId);
  if (upvoteIndex > -1) {
    issue.upvotes.splice(upvoteIndex, 1);
    await User.findByIdAndUpdate(issue.createdBy, { $inc: { points: -2 } });
  } else {
    issue.upvotes.push(req.user._id);
    await User.findByIdAndUpdate(issue.createdBy, { $inc: { points: 2 } });
    await checkAndAwardBadges(issue.createdBy);
    await checkUpvoteEscalation(issue._id);
  }

  await issue.save();
  res.json({ upvotes: issue.upvotes.length, hasUpvoted: upvoteIndex === -1 });
};

// POST /api/issues/:id/proof (Officer upload)
const uploadProof = async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No proof files uploaded' });
  
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  try {
    const imageUrls = await uploadMultipleImages(req.files);
    issue.images = [...(issue.images || []), ...imageUrls];
    await issue.save();
    res.json({ message: 'Proof uploaded', images: imageUrls });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ message: 'Failed to upload proof images' });
  }
};

// GET /api/issues/user/me
const getMyIssues = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { createdBy: req.user._id, isDeleted: false };
  
  if (status && status !== 'all') {
    const statusMap = {
      'open': 'Open',
      'in_progress': 'InProgress',
      'resolved': 'Resolved',
      'rejected': 'Rejected'
    };
    query.status = statusMap[status] || status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [issues, total] = await Promise.all([
    Issue.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title status category location description images upvotes createdAt slaDeadline slaBreached priority')
      .lean(),
    Issue.countDocuments(query)
  ]);

  // Compute upvotesCount since virtual fields don't work with .lean()
  const issuesWithCount = issues.map(issue => ({
    ...issue,
    upvotesCount: Array.isArray(issue.upvotes) ? issue.upvotes.length : 0,
  }));

  res.json({ 
    issues: issuesWithCount, 
    pagination: { 
      total, 
      page: parseInt(page), 
      pages: Math.ceil(total / (parseInt(limit) || 10)) 
    } 
  });
};

// DELETE /api/issues/:id
const deleteIssue = async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  if (req.user.role !== 'admin' && issue.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to delete this issue' });
  }

  issue.isDeleted = true;
  await issue.save();

  // Audit Log
  await AuditLog.create({
    adminId: req.user._id,
    action: 'DELETE',
    issueId: issue._id
  });

  res.json({ message: 'Issue deleted' });
};

// GET /api/issues/export/csv
const exportCSV = async (req, res) => {
  const issues = await Issue.find({ isDeleted: false })
    .populate('category')
    .populate('createdBy', 'name')
    .populate('assignedTo', 'name');

  const csv = generateIssuesCSV(issues);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=issues-${Date.now()}.csv`);
  res.send(csv);
};

// GET /api/issues/export/pdf
const exportPDF = async (req, res) => {
  const issues = await Issue.find({ isDeleted: false })
    .populate('category')
    .populate('createdBy', 'name')
    .populate('assignedTo', 'name');

  const resolvedIssues = issues.filter(i => i.status === 'Resolved' && i.resolvedAt);
  const avgResolutionHours = resolvedIssues.length > 0
    ? (resolvedIssues.reduce((acc, i) => acc + (new Date(i.resolvedAt) - new Date(i.createdAt)), 0) / (resolvedIssues.length * 1000 * 60 * 60)).toFixed(1)
    : '—';

  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'Open').length,
    inProgress: issues.filter(i => i.status === 'InProgress').length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
    avgResolutionHours
  };

  const pdfBuffer = await generateIssuesPDF(issues, stats);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);
  res.send(pdfBuffer);
};

// POST /api/issues/:id/rate
const rateIssue = async (req, res) => {
  const { rating, feedback } = req.body;
  const issue = await Issue.findById(req.params.id);

  if (!issue) return res.status(404).json({ message: 'Issue not found' });
  
  // Only the creator can rate
  if (issue.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to rate this issue' });
  }

  // Only resolved issues can be rated
  if (issue.status !== 'Resolved') {
    return res.status(400).json({ message: 'Only resolved issues can be rated' });
  }

  // Cannot rate twice
  if (issue.rating) {
    return res.status(400).json({ message: 'Issue has already been rated' });
  }

  issue.rating = rating;
  if (feedback) issue.feedback = feedback;
  await issue.save();

  // Give the officer points for a good rating
  if (issue.assignedTo && rating >= 4) {
    await User.findByIdAndUpdate(issue.assignedTo, { $inc: { points: 5 } });
  }

  res.json({ message: 'Rating submitted successfully', issue });
};

const commentsCtrl = require('./comments.controller');

module.exports = {
  getIssues,
  createIssue,
  editIssue,
  getIssueById,
  updateIssueStatus,
  toggleUpvote,
  uploadProof,
  getMyIssues,
  deleteIssue,
  exportCSV,
  exportPDF,
  rateIssue,
  getComments: commentsCtrl.getCommentsByIssue,
  addComment: commentsCtrl.createComment,
  replyToComment: commentsCtrl.replyToComment,
  deleteComment: commentsCtrl.deleteComment
};
