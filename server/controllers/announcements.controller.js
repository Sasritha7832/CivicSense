const Announcement = require('../models/Announcement');

// GET /api/announcements
const getActiveAnnouncements = async (req, res) => {
  const announcements = await Announcement.find({ active: true }).sort({ createdAt: -1 });
  res.json({ announcements });
};

// POST /api/announcements
const createAnnouncement = async (req, res) => {
  const { title, message, ward } = req.body;
  const io = req.app.get('io');

  const announcement = await Announcement.create({
    title,
    message,
    ward: ward || null,
    createdBy: req.user._id
  });

  // Broadcast to all connected clients
  if (io) {
    io.emit('announcement:new', announcement);
  }

  res.status(201).json({ announcement });
};

// DELETE /api/announcements/:id
const deleteAnnouncement = async (req, res) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
  
  const io = req.app.get('io');
  if (io) {
    io.emit('announcement:deleted', announcement._id);
  }
  
  res.json({ message: 'Announcement deleted' });
};

module.exports = {
  getActiveAnnouncements,
  createAnnouncement,
  deleteAnnouncement
};
