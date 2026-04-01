const articleService = require('../services/articleService');
const path = require('path');
const fs = require('fs');

/**
 * 🎯 [Slim Controller] จัดการบทความ (Articles)
 */

exports.getArticles = async (req, res, next) => {
  try {
    const { page = 1, limit = 6, ...filters } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const queryFilters = { 
      ...filters, 
      limit: parseInt(limit), 
      skip 
    };

    if (req.user.role !== 'SUPER_ADMIN') {
      queryFilters.status = 'PUBLISHED';
    }
    
    const { articles, total } = await articleService.getAllArticles(queryFilters);
    res.status(200).json({ articles, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
};

exports.getArticle = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const article = await articleService.getArticleBySlug(slug);

    if (!article) return res.status(404).json({ error: 'Article not found' });
    if (article.status !== 'PUBLISHED' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json(article);
  } catch (error) { next(error); }
};

exports.getArticleById = async (req, res, next) => {
  try {
    const article = await articleService.getArticleById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.status(200).json(article);
  } catch (error) { next(error); }
};

exports.createArticle = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const newArticle = await articleService.createArticle(req.body, req.user.id, req.ip);
    res.status(201).json(newArticle);
  } catch (error) { next(error); }
};

exports.updateArticle = async (req, res, next) => {
  try {
    const updatedArticle = await articleService.updateArticle(req.params.id, req.body, req.user.id, req.ip);
    res.status(200).json(updatedArticle);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Article not found' });
    next(error);
  }
};

exports.deleteArticle = async (req, res, next) => {
  try {
    await articleService.deleteArticle(req.params.id, req.user.id, req.ip);
    res.status(200).json({ message: 'Article deleted successfully' });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Article not found' });
    next(error);
  }
};

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const { articleId } = req.body;
    const { filename, baseUrl } = await articleService.processAndUploadImage(
      req.file.buffer, 
      articleId, 
      req.user.id, 
      req.ip, 
      req.protocol, 
      req.get('host')
    );

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const previewUrl = `${baseUrl}${token ? `?token=${token}` : ''}`;

    res.status(200).json({ url: previewUrl });
  } catch (error) { next(error); }
};

exports.serveImage = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/articles', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
};

exports.toggleFavorite = async (req, res, next) => {
  try {
    const result = await articleService.toggleFavorite(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

exports.getFavoriteStatus = async (req, res, next) => {
  try {
    const result = await articleService.getFavoriteStatus(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

exports.getComments = async (req, res, next) => {
  try {
    const comments = await articleService.getCommentsByArticle(req.params.id);
    res.status(200).json(comments);
  } catch (error) { next(error); }
};

exports.createComment = async (req, res, next) => {
  try {
    if (!req.body.content) return res.status(400).json({ error: 'Content is required' });
    
    const comment = await articleService.createComment({
      ...req.body,
      articleId: req.params.id
    }, req.user.id, req.ip);
    
    res.status(201).json(comment);
  } catch (error) { next(error); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    await articleService.deleteComment(req.params.commentId, req.user.id, req.user.role, req.ip);
    res.status(200).json({ message: 'Comment deleted' });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Comment not found' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Unauthorized' });
    next(error);
  }
};
