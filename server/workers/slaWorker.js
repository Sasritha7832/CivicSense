const { Worker } = require('bullmq');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { sendStatusUpdateEmail } = require('../utils/email');
const { checkRedisVersion } = require('../utils/redisCheck');
const { getQueue } = require('../utils/queueFallback');

const setupSLAWorker = (connection) => {
  const handler = async () => {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    // 1. Find issues approaching deadline (within 2 hours)
    const approaching = await Issue.find({
      status: { $in: ['Open', 'InProgress'] },
      slaDeadline: { $gt: now, $lt: warningThreshold },
      slaBreached: false,
      slaWarningSent: false,
      isDeleted: false
    }).populate('assignedTo');

    for (const issue of approaching) {
      if (issue.assignedTo) {
        const message = `⚠️ SLA Warning: "${issue.title}" deadline in under 2 hours!`;

        // Mark as warning sent
        issue.slaWarningSent = true;
        await issue.save();

        // Email
        await sendStatusUpdateEmail(
          issue.assignedTo.email,
          issue,
          issue.status
        ).catch(e => console.error('Email error:', e));
      }
    }

    // 2. Find breached issues
    const breached = await Issue.find({
      status: { $in: ['Open', 'InProgress'] },
      slaDeadline: { $lt: now },
      slaBreached: false,
      isDeleted: false
    }).populate('assignedTo');

    for (const issue of breached) {
      const oldPriority = issue.priority;
      issue.slaBreached = true;
      issue.priority = 'Critical'; // Escalate
      await issue.save();

      // Audit Log
      await AuditLog.create({
        adminId: issue.assignedTo?._id || null,
        action: 'SLA_BREACHED',
        issueId: issue._id,
        field: 'priority',
        oldValue: oldPriority,
        newValue: 'Critical'
      });

      // Notify Admins
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          type: 'sla_breach',
          message: `SLA BREACHED: "${issue.title}" has passed its deadline.`,
          issueId: issue._id
        });
      }
    }

    console.log(`[slaWorker] Check complete at ${now.toISOString()}`);
  };

  // Register with fallback queue
  getQueue('sla-monitor', { connection }).registerHandler(handler);

  return {
    init: async () => {
      const compatible = await checkRedisVersion();
      if (compatible) {
        const slaQueue = getQueue('sla-monitor', { connection });
        await slaQueue.init();

        // Schedule cron if compatible
        await slaQueue.add('check-sla', {}, {
          repeat: { pattern: '*/15 * * * *' },
          removeOnComplete: true
        });

        return new Worker('sla-monitor', handler, { connection });
      } else {
        console.warn('[slaWorker] Redis version too low. Using setInterval fallback for SLA checks.');
        // Fallback: Run every 15 minutes using setInterval
        const interval = setInterval(handler, 15 * 60 * 1000);
        // Run once immediately
        handler();

        return {
          close: async () => clearInterval(interval)
        };
      }
    }
  };
};

module.exports = setupSLAWorker;
