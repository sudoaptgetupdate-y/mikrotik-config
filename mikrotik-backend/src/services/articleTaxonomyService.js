const prisma = require('../config/prisma');

// --- Category Services ---
exports.getAllCategories = async () => {
  return await prisma.articleCategory.findMany({
    include: {
      _count: {
        select: { articles: true }
      }
    },
    orderBy: { name: 'asc' }
  });
};

exports.createCategory = async (data) => {
  return await prisma.articleCategory.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description
    }
  });
};

exports.updateCategory = async (id, data) => {
  return await prisma.articleCategory.update({
    where: { id: parseInt(id) },
    data
  });
};

exports.deleteCategory = async (id) => {
  return await prisma.articleCategory.delete({
    where: { id: parseInt(id) }
  });
};

// --- Tag Services ---
exports.getAllTags = async () => {
  return await prisma.articleTag.findMany({
    include: {
      _count: {
        select: { articles: true }
      }
    },
    orderBy: { name: 'asc' }
  });
};

exports.getOrCreateTags = async (tagNames) => {
  if (!tagNames || !tagNames.length) return [];

  const tags = await Promise.all(
    tagNames.map(async (name) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      return await prisma.articleTag.upsert({
        where: { name },
        update: {},
        create: { name, slug }
      });
    })
  );
  return tags;
};

exports.deleteTag = async (id) => {
  return await prisma.articleTag.delete({
    where: { id: parseInt(id) }
  });
};
