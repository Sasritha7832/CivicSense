const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { getIO } = require('../config/socket');

const checkUpvoteEscalation = async (issueId) => {
  const issue = await Issue.findById(issueId);
  if (!issue) return;

  if (issue.upvotes.length >= 50 && issue.priority !== 'Critical') {
    const oldPriority = issue.priority;
    issue.priority = 'Critical';
    await issue.save();

    // Audit Log
    await AuditLog.create({
      adminId: null, 
      action: 'UPVOTE_ESCALATION',
      issueId: issue._id,
      field: 'priority',
      oldValue: oldPriority,
      newValue: 'Critical'
    });

    // Notify Admins
    const admins = await User.find({ role: 'admin' });
    const io = getIO();

    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'upvote',
        message: `🔥 Community Pressure: "${issue.title}" has 50+ upvotes and is now Critical!`,
        issueId: issue._id
      });

      if (io) {
        io.to(`user:${admin._id}`).emit('notification:push', {
          title: 'Community Pressure',
          message: `Issue "${issue.title}" escalated to Critical.`
        });
      }
    }
  }
};

module.exports = checkUpvoteEscalation;
