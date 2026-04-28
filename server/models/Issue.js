const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, default: '' },
  ward: { type: String, default: '' },
}, { _id: false });

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'InProgress', 'Resolved', 'Rejected'],
    default: 'Open',
  },
  location: { type: locationSchema, required: true },
  images: [String],
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  resolutionComment: { type: String, default: null },
  internalNotes: { type: String, default: null },
  slaDeadline: { type: Date, default: null },
  slaBreached: { type: Boolean, default: false },
  slaWarningSent: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

issueSchema.virtual('upvotesCount').get(function() {
  return this.upvotes ? this.upvotes.length : 0;
});

issueSchema.index({ 'location.lat': 1, 'location.lng': 1 });
issueSchema.index({ 'location.ward': 1, status: 1 });
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ createdBy: 1, createdAt: -1 });
issueSchema.index({ slaDeadline: 1, status: 1 });
issueSchema.index({ category: 1, status: 1, isDeleted: 1 });

module.exports = mongoose.model('Issue', issueSchema);
