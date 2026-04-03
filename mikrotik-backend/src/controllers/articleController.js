const articleService = require('../services/articleService');
const prisma = require('../config/prisma');
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

    // If it's not admin, we only show published articles. 
    // The service will further filter by visibility based on req.user.role
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      queryFilters.status = 'PUBLISHED';
    }
    
    const { articles, total } = await articleService.getAllArticles(queryFilters, req.user.role);
    res.status(200).json({ articles, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
};

exports.getArticle = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const article = await articleService.getArticleBySlug(slug, req.user.role);

    if (!article) return res.status(404).json({ error: 'Article not found or access denied' });
    
    // Status check for non-admins
    if (article.status !== 'PUBLISHED' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json(article);
  } catch (error) { next(error); }
};

exports.getArticleById = async (req, res, next) => {
  try {
    const article = await articleService.getArticleById(req.params.id, req.user.role);
    if (!article) return res.status(404).json({ error: 'Article not found or access denied' });
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

exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video provided' });

    const { articleId } = req.body;
    const { filename, baseUrl } = await articleService.processAndUploadVideo(
      req.file, 
      articleId, 
      req.user.id, 
      req.ip, 
      req.protocol, 
      req.get('host')
    );

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const finalUrl = `${baseUrl}${token ? `?token=${token}` : ''}`;

    res.status(200).json({ url: finalUrl });
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

exports.serveVideo = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/videos', filename);

  if (fs.existsSync(filePath)) {
    // รองรับ Partial Content (Streaming) สำหรับวิดีโอ
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } else {
    res.status(404).json({ error: 'Video not found' });
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

// ==========================================
// 📎 Attachment Controllers
// ==========================================

exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { articleId } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId is required' });

    const attachment = await articleService.uploadAttachment(req.file, articleId, req.user.id, req.ip);
    res.status(201).json(attachment);
  } catch (error) { next(error); }
};

exports.deleteAttachment = async (req, res, next) => {
  try {
    await articleService.deleteAttachment(req.params.id, req.user.id, req.ip);
    res.status(200).json({ message: 'Attachment deleted' });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Attachment not found' });
    next(error);
  }
};

exports.toggleAttachmentVisibility = async (req, res, next) => {
  try {
    const attachment = await articleService.toggleAttachmentVisibility(req.params.id);
    res.status(200).json(attachment);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Attachment not found' });
    next(error);
  }
};

exports.serveAttachment = async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../uploads/attachments', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    const attachment = await prisma.articleAttachment.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!attachment) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(__dirname, '../../uploads/attachments', attachment.storageName);
    
    if (fs.existsSync(filePath)) {
      await articleService.incrementDownloadCount(attachment.id);
      res.download(filePath, attachment.filename);
    } else {
      res.status(404).json({ error: 'File not found on disk' });
    }
  } catch (error) { next(error); }
};
