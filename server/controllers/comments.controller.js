const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

// POST /api/issues/:id/comments
const createComment = async (req, res) => {
  const { body, isOfficialNote } = req.body;
  const issueId = req.params.id;

  const issue = await Issue.findById(issueId);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  const comment = await Comment.create({
    issueId,
    author: req.user._id,
    body,
    isOfficialNote: isOfficialNote && (req.user.role === 'admin' || req.user.role === 'officer')
  });

  const populatedComment = await comment.populate('author', 'name role');

  // Notify issue creator if not the same person
  if (issue.createdBy.toString() !== req.user._id.toString()) {
    const notification = await Notification.create({
      userId: issue.createdBy,
      type: 'comment',
      message: `${req.user.name} commented on your issue: "${issue.title}"`,
      issueId: issue._id
    });

    const io = getIO();
    if (io) {
      io.to(`user:${issue.createdBy}`).emit('notification:push', {
        title: 'New Comment',
        message: notification.message,
        issueId: issue._id
      });
    }
  }

  res.status(201).json(populatedComment);
};

// POST /api/issues/:id/comments/:commentId/reply
const replyToComment = async (req, res) => {
  const { body } = req.body;
  const { id: issueId, commentId: parentId } = req.params;

  const parentComment = await Comment.findById(parentId);
  if (!parentComment) return res.status(404).json({ message: 'Parent comment not found' });

  const reply = await Comment.create({
    issueId,
    author: req.user._id,
    body,
    parentId
  });

  const populatedReply = await reply.populate('author', 'name role');
  res.status(201).json(populatedReply);
};

// DELETE /api/issues/:id/comments/:commentId
const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);

  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  // Only author or admin can delete
  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  await Comment.deleteMany({ $or: [{ _id: commentId }, { parentId: commentId }] });
  res.json({ message: 'Comment deleted' });
};

// GET /api/issues/:id/comments
const getCommentsByIssue = async (req, res) => {
  const comments = await Comment.find({ issueId: req.params.id })
    .populate('author', 'name role')
    .sort({ createdAt: 1 });

  // Nesting logic for 1 level deep as per spec
  const rootComments = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => c.parentId);

  const nested = rootComments.map(root => ({
    ...root.toObject(),
    replies: replies.filter(r => r.parentId.toString() === root._id.toString())
  }));

  res.json(nested);
};

module.exports = { createComment, replyToComment, deleteComment, getCommentsByIssue };
