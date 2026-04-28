const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  icon: { type: String, default: '📌' },
  department: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  defaultSlaHours: { type: Number, default: 72 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Category', categorySchema);
