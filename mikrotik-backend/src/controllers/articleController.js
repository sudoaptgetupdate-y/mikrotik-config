const articleService = require('../services/articleService');
const taxonomyService = require('../services/articleTaxonomyService');
const logService = require('../services/logService');
const path = require('path');
const fs = require('fs');

// Helper: Generate Slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0E00-\u0E7F-]+/g, '')
    .replace(/--+/g, '-');
};

// Helper: Clean URL
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

exports.getArticles = async (req, res) => {
  const { categoryId, authorId, tag } = req.query;
  
  const filters = { categoryId, authorId, tag };
  if (req.user.role !== 'SUPER_ADMIN') {
    filters.status = 'PUBLISHED';
  }

  const articles = await articleService.getAllArticles(filters);
  res.status(200).json(articles);
};

exports.getArticle = async (req, res) => {
  const { slug } = req.params;
  const article = await articleService.getArticleBySlug(slug);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  if (article.status !== 'PUBLISHED' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.status(200).json(article);
};

exports.createArticle = async (req, res) => {
  const { title, content, excerpt, thumbnail, categoryId, status, tagNames } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  let slug = slugify(title);
  const existing = await articleService.getArticleBySlug(slug);
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  // Handle Tags
  let tagIds = [];
  if (tagNames && Array.isArray(tagNames)) {
    const tags = await taxonomyService.getOrCreateTags(tagNames);
    tagIds = tags.map(t => t.id);
  }

  const articleData = { 
    title, 
    slug, 
    content, 
    excerpt, 
    thumbnail: cleanUrl(thumbnail), 
    categoryId, 
    status,
    tags: tagIds
  };
  
  const newArticle = await articleService.createArticle(articleData, req.user.id);

  try {
    await logService.createActivityLog({
      userId: req.user.id,
      action: 'CREATE_ARTICLE',
      details: `Created article: ${title}`,
      ipAddress: req.ip
    });
  } catch (err) {
    console.error("Non-critical logging error during article creation:", err.message);
  }

  res.status(201).json(newArticle);
};

exports.updateArticle = async (req, res) => {
  const { id } = req.params;
  const { title, content, excerpt, thumbnail, categoryId, status, slug, tagNames } = req.body;

  const article = await articleService.getArticleById(id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Handle Tags
  let tagIds = undefined;
  if (tagNames && Array.isArray(tagNames)) {
    const tags = await taxonomyService.getOrCreateTags(tagNames);
    tagIds = tags.map(t => t.id);
  }

  const updatedData = { 
    title, 
    content, 
    excerpt, 
    thumbnail: cleanUrl(thumbnail), 
    categoryId, 
    status, 
    slug,
    tags: tagIds
  };
  
  if (title && title !== article.title && !slug) {
    let newSlug = slugify(title);
    const existing = await articleService.getArticleBySlug(newSlug);
    if (existing && existing.id !== parseInt(id)) {
        newSlug = `${newSlug}-${Date.now()}`;
    }
    updatedData.slug = newSlug;
  }

  const updatedArticle = await articleService.updateArticle(id, updatedData);

  try {
    await logService.createActivityLog({
      userId: req.user.id,
      action: 'UPDATE_ARTICLE',
      details: `Updated article: ${updatedArticle.title}`,
      ipAddress: req.ip
    });
  } catch (err) {
    console.error("Non-critical logging error during article update:", err.message);
  }

  res.status(200).json(updatedArticle);
};

exports.deleteArticle = async (req, res) => {
  const { id } = req.params;
  const article = await articleService.getArticleById(id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  await articleService.deleteArticle(id);

  try {
    await logService.createActivityLog({
      userId: req.user.id,
      action: 'DELETE_ARTICLE',
      details: `Deleted article: ${article.title}`,
      ipAddress: req.ip
    });
  } catch (err) {
    console.error("Non-critical logging error during article deletion:", err.message);
  }

  res.status(200).json({ message: 'Article deleted successfully' });
};

exports.uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const { articleId } = req.body;
  const filename = req.file.filename;

  const protocol = req.protocol;
  const host = req.get('host');
  const fullBaseUrl = `${protocol}://${host}`;

  const baseUrl = `${fullBaseUrl}/api/articles/images/${filename}`;

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  const previewUrl = `${baseUrl}${token ? `?token=${token}` : ''}`;

  try {
    await articleService.logArticleImage(articleId, filename, baseUrl);
    await logService.createActivityLog({
      userId: req.user.id,
      action: 'UPLOAD_ARTICLE_IMAGE',
      details: `Uploaded image: ${filename}`,
      ipAddress: req.ip
    });
  } catch (logError) {
    console.error("Non-critical logging error during upload:", logError.message);
  }

  res.status(200).json({ url: previewUrl });
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
