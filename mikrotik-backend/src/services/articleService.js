const prisma = require('../config/prisma');
const logService = require('./logService');
const taxonomyService = require('./articleTaxonomyService');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// ==========================================
// 🛠 Helper Functions (Private)
// ==========================================

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0E00-\u0E7F-]+/g, '')
    .replace(/--+/g, '-');
};

const cleanUrl = (url) => {
  if (!url) return url;
  try {
    if (url.startsWith('data:')) return url;
    const urlObj = new URL(url, 'http://localhost'); 
    urlObj.searchParams.delete('token');
    return url.startsWith('http') ? urlObj.toString() : urlObj.pathname;
  } catch (e) {
    return url.split('?')[0];
  }
};

// ==========================================
// 🎯 Article Services
// ==========================================

exports.getAllArticles = async (filters = {}, userRole = null) => {
  const { status, categoryId, authorId, tag, favoritedByUserId, limit, skip, search } = filters;
  
  const where = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (authorId) where.authorId = parseInt(authorId);
  
  // Visibility Filter
  if (userRole === 'GUEST') {
    where.visibility = 'PUBLIC';
  } else if (userRole === 'EMPLOYEE') {
    where.visibility = { in: ['PUBLIC', 'EMPLOYEE'] };
  } else if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    // Admin sees everything
  } else {
    // Guest or Not logged in (if applicable)
    where.visibility = 'PUBLIC';
  }

  if (search) {
    const searchCondition = { contains: search };
    const searchConditions = [
      { title: searchCondition },
      { content: searchCondition },
      { excerpt: searchCondition },
      { tags: { some: { name: searchCondition } } }
    ];
    if (search.startsWith('#')) {
      const tagSearch = search.substring(1);
      if (tagSearch) searchConditions.push({ tags: { some: { name: { contains: tagSearch } } } });
    }
    where.OR = searchConditions;
  }

  if (tag) where.tags = { some: { name: tag } };
  if (favoritedByUserId) where.favoritedBy = { some: { userId: parseInt(favoritedByUserId) } };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: skip ? parseInt(skip) : undefined,
      take: limit ? parseInt(limit) : undefined,
      include: {
        category: true,
        tags: true,
        author: { select: { id: true, firstName: true, lastName: true, username: true, role: true } }
      }
    }),
    prisma.article.count({ where })
  ]);

  return { articles, total };
};

exports.getArticleBySlug = async (slug, userRole = null) => {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      category: true,
      tags: true,
      author: { select: { id: true, firstName: true, lastName: true, username: true, role: true } }
    }
  });

  if (!article) return null;

  // Visibility Check
  const roleLevels = { 'GUEST': 0, 'EMPLOYEE': 1, 'ADMIN': 2, 'SUPER_ADMIN': 2 };
  const visibilityLevels = { 'PUBLIC': 0, 'EMPLOYEE': 1, 'ADMIN': 2 };
  
  const userLevel = roleLevels[userRole] || 0;
  const articleLevel = visibilityLevels[article.visibility] || 0;

  if (userLevel < articleLevel) {
    return null; // Or throw FORBIDDEN
  }

  const updatedArticle = await prisma.article.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
    include: {
      category: true,
      tags: true,
      author: { select: { id: true, firstName: true, lastName: true, username: true, role: true } }
    }
  });
  return updatedArticle;
};

exports.getArticleById = async (id, userRole = null) => {
    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        tags: true,
        author: { select: { id: true, firstName: true, lastName: true, username: true, role: true } }
      }
    });

    if (!article) return null;

    // Visibility Check
    const roleLevels = { 'GUEST': 0, 'EMPLOYEE': 1, 'ADMIN': 2, 'SUPER_ADMIN': 2 };
    const visibilityLevels = { 'PUBLIC': 0, 'EMPLOYEE': 1, 'ADMIN': 2 };
    
    const userLevel = roleLevels[userRole] || 0;
    const articleLevel = visibilityLevels[article.visibility] || 0;

    if (userLevel < articleLevel) {
      return null;
    }

    return article;
};

exports.createArticle = async (data, authorId, ipAddress) => {
  const { title, content, excerpt, thumbnail, categoryId, status, visibility, tagNames, isPinned } = data;
  
  // 1. จัดการ Slug
  let slug = slugify(title);
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  // 2. จัดการ Tags
  let tagIds = [];
  if (tagNames && Array.isArray(tagNames)) {
    const tags = await taxonomyService.getOrCreateTags(tagNames);
    tagIds = tags.map(t => t.id);
  }

  // 3. สร้างบทความ
  const newArticle = await prisma.article.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      thumbnail: cleanUrl(thumbnail),
      status: status || 'DRAFT',
      visibility: visibility || 'PUBLIC',
      isPinned: !!isPinned,
      authorId: parseInt(authorId),
      categoryId: categoryId ? parseInt(categoryId) : null,
      tags: { connect: tagIds.map(id => ({ id: parseInt(id) })) }
    }
  });

  // 4. บันทึก Log
  await logService.createActivityLog({
    userId: authorId,
    action: 'CREATE_ARTICLE',
    details: `Created article: ${title}`,
    ipAddress
  });

  return newArticle;
};

exports.updateArticle = async (id, data, userId, ipAddress) => {
  const { title, content, excerpt, thumbnail, categoryId, status, visibility, slug: requestedSlug, tagNames, isPinned } = data;
  const articleId = parseInt(id);
  const oldArticle = await prisma.article.findUnique({ where: { id: articleId } });
  if (!oldArticle) throw new Error("NOT_FOUND");

  // 1. จัดการ Tags
  let tagUpdate = undefined;
  if (tagNames && Array.isArray(tagNames)) {
    const tags = await taxonomyService.getOrCreateTags(tagNames);
    tagUpdate = { set: tags.map(t => ({ id: t.id })) };
  }

  // 2. จัดการ Slug
  let finalSlug = requestedSlug || oldArticle.slug;
  if (title && title !== oldArticle.title && !requestedSlug) {
    finalSlug = slugify(title);
    const existing = await prisma.article.findUnique({ where: { slug: finalSlug } });
    if (existing && existing.id !== articleId) finalSlug = `${finalSlug}-${Date.now()}`;
  }

  // 3. อัปเดตข้อมูล
  const updatedArticle = await prisma.article.update({
    where: { id: articleId },
    data: {
      title,
      content,
      excerpt,
      thumbnail: cleanUrl(thumbnail),
      status,
      visibility,
      isPinned: isPinned !== undefined ? !!isPinned : undefined,
      slug: finalSlug,
      categoryId: categoryId !== undefined ? (categoryId ? parseInt(categoryId) : null) : undefined,
      tags: tagUpdate
    },
    include: { tags: true, category: true }
  });

  // 4. บันทึก Log
  await logService.createActivityLog({
    userId,
    action: 'UPDATE_ARTICLE',
    details: `Updated article: ${updatedArticle.title}`,
    ipAddress
  });

  return updatedArticle;
};

exports.deleteArticle = async (id, userId, ipAddress) => {
  const articleId = parseInt(id);
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error("NOT_FOUND");

  const deleted = await prisma.article.delete({ where: { id: articleId } });

  await logService.createActivityLog({
    userId,
    action: 'DELETE_ARTICLE',
    details: `Deleted article: ${article.title}`,
    ipAddress
  });

  return deleted;
};

// ==========================================
// 🖼 Image Services
// ==========================================

exports.processAndUploadImage = async (fileBuffer, articleId, userId, ipAddress, protocol, host) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = `article-${uniqueSuffix}.webp`;
  const uploadDir = path.join(__dirname, '../../uploads/articles/');
  const filePath = path.join(uploadDir, filename);

  // 1. Process image with Sharp
  await sharp(fileBuffer)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  const fullBaseUrl = `${protocol}://${host}`;
  const baseUrl = `${fullBaseUrl}/api/articles/images/${filename}`;

  // 2. บันทึกข้อมูลลง DB
  const parsedId = articleId ? parseInt(articleId) : null;
  const finalId = (!isNaN(parsedId) && parsedId !== null) ? parsedId : undefined;

  await prisma.articleImage.create({
    data: {
      url: baseUrl,
      filename,
      ...(finalId && { articleId: finalId })
    }
  });

  // 3. บันทึก Log
  await logService.createActivityLog({
    userId,
    action: 'UPLOAD_ARTICLE_IMAGE',
    details: `Uploaded image: ${filename}`,
    ipAddress
  });

  return { filename, baseUrl };
};

// ==========================================
// ⭐ Favorite & Comments Services
// ==========================================

exports.toggleFavorite = async (userId, articleId) => {
  const favWhere = { userId_articleId: { userId: parseInt(userId), articleId: parseInt(articleId) } };
  const favorite = await prisma.favoriteArticle.findUnique({ where: favWhere });

  if (favorite) {
    await prisma.favoriteArticle.delete({ where: favWhere });
    return { isFavorited: false };
  } else {
    await prisma.favoriteArticle.create({ data: { userId: parseInt(userId), articleId: parseInt(articleId) } });
    return { isFavorited: true };
  }
};

exports.getFavoriteStatus = async (userId, articleId) => {
  const favorite = await prisma.favoriteArticle.findUnique({
    where: { userId_articleId: { userId: parseInt(userId), articleId: parseInt(articleId) } }
  });
  return { isFavorited: !!favorite };
};

exports.getCommentsByArticle = async (articleId) => {
  return await prisma.comment.findMany({
    where: { articleId: parseInt(articleId), parentId: null },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, username: true, role: true } },
      replies: {
        include: { user: { select: { id: true, firstName: true, lastName: true, username: true, role: true } } },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

exports.createComment = async (data, userId, ipAddress) => {
  const { content, articleId, parentId } = data;
  const comment = await prisma.comment.create({
    data: {
      content,
      articleId: parseInt(articleId),
      userId: parseInt(userId),
      parentId: parentId ? parseInt(parentId) : null
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, username: true } } }
  });

  await logService.createActivityLog({
    userId,
    action: 'CREATE_COMMENT',
    details: `Commented on article ID: ${articleId}`,
    ipAddress
  });

  return comment;
};

exports.deleteComment = async (id, userId, userRole, ipAddress) => {
  const comment = await prisma.comment.findUnique({ where: { id: parseInt(id) } });
  if (!comment) throw new Error("NOT_FOUND");

  if (comment.userId !== userId && userRole !== 'SUPER_ADMIN') {
    throw new Error("FORBIDDEN");
  }

  await prisma.comment.delete({ where: { id: parseInt(id) } });

  await logService.createActivityLog({
    userId,
    action: 'DELETE_COMMENT',
    details: `Deleted comment ID: ${id}`,
    ipAddress
  });

  return { success: true };
};
