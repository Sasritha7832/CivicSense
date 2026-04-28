const Notification = require('../models/Notification');

// GET /api/notifications
const getNotifications = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unread] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('issueId', 'title status'),
    Notification.countDocuments({ userId: req.user._id }),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  res.json({ notifications, total, unread, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
  res.json({ message: 'Marked as read' });
};

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read' });
};

module.exports = { getNotifications, markRead, markAllRead };
