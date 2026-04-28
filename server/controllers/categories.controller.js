const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');

const getCategories = async (req, res) => {
  const cats = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ categories: cats });
};

const createCategory = async (req, res) => {
  const { name, icon, department, color, defaultSlaHours } = req.body;
  const cat = await Category.create({ name, icon, department, color, defaultSlaHours, createdBy: req.user?._id });
  if (req.user) await AuditLog.create({ adminId: req.user._id, action: 'category_created', newValue: { name } });
  res.status(201).json({ category: cat });
};

const updateCategory = async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  if (req.user) await AuditLog.create({ adminId: req.user._id, action: 'category_updated', newValue: req.body });
  res.json({ category: cat });
};

const deleteCategory = async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  if (req.user) await AuditLog.create({ adminId: req.user._id, action: 'category_deleted', newValue: { id: req.params.id } });
  res.json({ message: 'Category deactivated' });
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
