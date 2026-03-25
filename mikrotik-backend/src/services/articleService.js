const prisma = require('../config/prisma');

exports.getAllArticles = async (filters = {}) => {
  const { status, categoryId, authorId, tag, favoritedByUserId, limit, skip, search } = filters;
  
  const where = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (authorId) where.authorId = parseInt(authorId);
  
  if (search) {
    const searchCondition = { contains: search };
    const searchConditions = [
      { title: searchCondition },
      { content: searchCondition },
      { excerpt: searchCondition },
      {
        tags: {
          some: {
            name: searchCondition
          }
        }
      }
    ];

    // If search starts with #, also search for the tag name without #
    if (search.startsWith('#')) {
      const tagSearch = search.substring(1);
      if (tagSearch) {
        searchConditions.push({
          tags: {
            some: {
              name: { contains: tagSearch }
            }
          }
        });
      }
    }

    where.OR = searchConditions;
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

exports.getCommentsByArticle = async (articleId) => {
  return await prisma.comment.findMany({
    where: {
      articleId: parseInt(articleId),
      parentId: null // Get only top-level comments first
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true
        }
      },
      replies: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

exports.createComment = async (data) => {
  const { content, articleId, userId, parentId } = data;
  return await prisma.comment.create({
    data: {
      content,
      articleId: parseInt(articleId),
      userId: parseInt(userId),
      parentId: parentId ? parseInt(parentId) : null
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true
        }
      }
    }
  });
};

exports.deleteComment = async (id, userId, userRole) => {
  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(id) }
  });

  if (!comment) return { error: 'Comment not found', status: 404 };

  // Allow owner or SUPER_ADMIN to delete
  if (comment.userId !== userId && userRole !== 'SUPER_ADMIN') {
    return { error: 'Unauthorized', status: 403 };
  }

  await prisma.comment.delete({
    where: { id: parseInt(id) }
  });

  return { success: true };
};
