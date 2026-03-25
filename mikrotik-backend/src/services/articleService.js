const prisma = require('../config/prisma');

exports.getAllArticles = async (filters = {}) => {
  const { status, categoryId, authorId, tag, favoritedByUserId, limit, skip, search } = filters;
  
  const where = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (authorId) where.authorId = parseInt(authorId);
  
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { excerpt: { contains: search } }
    ];
  }

  if (tag) {
    where.tags = {
      some: { name: tag }
    };
  }
  
  if (favoritedByUserId) {
    where.favoritedBy = {
      some: { userId: parseInt(favoritedByUserId) }
    };
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: skip ? parseInt(skip) : undefined,
      take: limit ? parseInt(limit) : undefined,
      include: {
        category: true,
        tags: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true
          }
        }
      }
    }),
    prisma.article.count({ where })
  ]);

  return { articles, total };
};

exports.getArticleBySlug = async (slug) => {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      category: true,
      tags: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true
        }
      }
    }
  });

  if (article) {
    // Increment view count
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } }
    });
  }

  return article;
};

exports.getArticleById = async (id) => {
    return await prisma.article.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        tags: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true
          }
        }
      }
    });
};

exports.createArticle = async (data, authorId) => {
  const { title, slug, content, excerpt, thumbnail, categoryId, status, tags } = data;
  
  return await prisma.article.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      thumbnail,
      status: status || 'DRAFT',
      authorId: parseInt(authorId),
      categoryId: categoryId ? parseInt(categoryId) : null,
      tags: {
        connect: tags ? tags.map(id => ({ id: parseInt(id) })) : []
      }
    }
  });
};

exports.updateArticle = async (id, data) => {
  const { tags, categoryId, ...rest } = data;
  
  const updateData = { ...rest };
  if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;
  if (tags) {
    updateData.tags = {
      set: tags.map(tagId => ({ id: parseInt(tagId) }))
    };
  }

  return await prisma.article.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      tags: true,
      category: true
    }
  });
};

exports.deleteArticle = async (id) => {
  // First, get the article to find associated images
  const article = await prisma.article.findUnique({
    where: { id: parseInt(id) },
    include: { images: true }
  });

  if (!article) return null;

  // Delete article (cascade images if needed, but let's handle it)
  return await prisma.article.delete({
    where: { id: parseInt(id) }
  });
};

exports.logArticleImage = async (articleId, filename, url) => {
  try {
    const parsedId = articleId ? parseInt(articleId) : null;
    const finalId = (!isNaN(parsedId) && parsedId !== null) ? parsedId : undefined;

    return await prisma.articleImage.create({
      data: {
        url,
        filename,
        ...(finalId && { articleId: finalId }) // ใส่ articleId เฉพาะเมื่อมีค่าที่ถูกต้องเท่านั้น
      }
    });
  } catch (error) {
    console.error("Error logging article image:", error.message);
    // ถึงแม้จะบันทึกลง DB ไม่สำเร็จ แต่ไฟล์ถูกบันทึกไปแล้ว เราควรปล่อยผ่านเพื่อให้ Editor ใช้งานต่อได้
    return { url, filename }; 
  }
};

exports.toggleFavorite = async (userId, articleId) => {
  const favorite = await prisma.favoriteArticle.findUnique({
    where: {
      userId_articleId: {
        userId: parseInt(userId),
        articleId: parseInt(articleId)
      }
    }
  });

  if (favorite) {
    await prisma.favoriteArticle.delete({
      where: {
        userId_articleId: {
          userId: parseInt(userId),
          articleId: parseInt(articleId)
        }
      }
    });
    return { isFavorited: false };
  } else {
    await prisma.favoriteArticle.create({
      data: {
        userId: parseInt(userId),
        articleId: parseInt(articleId)
      }
    });
    return { isFavorited: true };
  }
};

exports.getFavoriteStatus = async (userId, articleId) => {
  const favorite = await prisma.favoriteArticle.findUnique({
    where: {
      userId_articleId: {
        userId: parseInt(userId),
        articleId: parseInt(articleId)
      }
    }
  });
  return { isFavorited: !!favorite };
};
