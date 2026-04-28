const Issue = require('../models/Issue');

// GET /api/stats/public — No auth required
const getPublicStats = async (req, res) => {
  // Ward-level performance
  const wardStats = await Issue.aggregate([
    { $match: { isDeleted: false } },
    { $group: {
      _id: '$location.ward',
      total: { $sum: 1 },
      open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
      resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
      avgResMs: {
        $avg: {
          $cond: [
            { $and: [{ $eq: ['$status', 'Resolved'] }, { $ne: ['$resolvedAt', null] }] },
            { $subtract: ['$resolvedAt', '$createdAt'] },
            null,
          ],
        },
      },
    }},
    { $project: {
      ward: { $ifNull: ['$_id', 'Unknown'] },
      total: 1, open: 1, resolved: 1,
      closedRatio: { $cond: [{ $gt: ['$total', 0] }, { $divide: ['$resolved', '$total'] }, 0] },
      avgResolutionHours: { $round: [{ $divide: [{ $ifNull: ['$avgResMs', 0] }, 3600000] }, 1] },
    }},
    { $sort: { total: -1 } },
  ]);

  // Category breakdown
  const byCategory = await Issue.aggregate([
    { $match: { isDeleted: false } },
    { $group: {
      _id: '$category',
      total: { $sum: 1 },
      resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
      avgResMs: {
        $avg: {
          $cond: [
            { $and: [{ $eq: ['$status', 'Resolved'] }, { $ne: ['$resolvedAt', null] }] },
            { $subtract: ['$resolvedAt', '$createdAt'] },
            null,
          ],
        },
      },
    }},
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    { $project: {
      category: { $ifNull: ['$cat.name', 'Unknown'] },
      icon: { $ifNull: ['$cat.icon', '📌'] },
      total: 1, resolved: 1,
      avgResolutionHours: { $round: [{ $divide: [{ $ifNull: ['$avgResMs', 0] }, 3600000] }, 1] },
    }},
    { $sort: { total: -1 } },
  ]);

  // Open vs closed ratio over time
  const total = await Issue.countDocuments({ isDeleted: false });
  const open = await Issue.countDocuments({ status: 'Open', isDeleted: false });
  const inProgress = await Issue.countDocuments({ status: 'InProgress', isDeleted: false });
  const resolved = await Issue.countDocuments({ status: 'Resolved', isDeleted: false });

  res.json({
    wardStats,
    byCategory,
    totals: {
      total,
      open,
      inProgress,
      resolved,
      closedRatio: total > 0 ? Number((resolved / total).toFixed(2)) : 0
    },
    lastUpdated: new Date(),
  });
};

module.exports = { getPublicStats };
