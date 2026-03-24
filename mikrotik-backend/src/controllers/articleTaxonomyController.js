const taxonomyService = require('../services/articleTaxonomyService');
const logService = require('../services/logService');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0E00-\u0E7F-]+/g, '')
    .replace(/--+/g, '-');
};

// --- Category Controllers ---
exports.getCategories = async (req, res) => {
  const categories = await taxonomyService.getAllCategories();
  res.status(200).json(categories);
};

exports.createCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const category = await taxonomyService.createCategory({
    name,
    description,
    slug: slugify(name)
  });

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'CREATE_CATEGORY',
    details: `Created category: ${name}`,
    ipAddress: req.ip
  });

  res.status(201).json(category);
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const data = { description };
  if (name) data.name = name;
  if (name) data.slug = slugify(name);

  const category = await taxonomyService.updateCategory(id, data);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_CATEGORY',
    details: `Updated category: ${category.name}`,
    ipAddress: req.ip
  });

  res.status(200).json(category);
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  await taxonomyService.deleteCategory(id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'DELETE_CATEGORY',
    details: `Deleted category ID: ${id}`,
    ipAddress: req.ip
  });

  res.status(200).json({ message: 'Category deleted successfully' });
};

// --- Tag Controllers ---
exports.getTags = async (req, res) => {
  const tags = await taxonomyService.getAllTags();
  res.status(200).json(tags);
};

exports.deleteTag = async (req, res) => {
  const { id } = req.params;
  await taxonomyService.deleteTag(id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'DELETE_TAG',
    details: `Deleted tag ID: ${id}`,
    ipAddress: req.ip
  });

  res.status(200).json({ message: 'Tag deleted successfully' });
};
