const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const taxonomyController = require('../controllers/articleTaxonomyController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer
const uploadDir = path.join(__dirname, '../../uploads/articles/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only images are allowed"));
  }
});

// Multer for Attachments
const attachStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/attachments/');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const attachUpload = multer({
  storage: attachStorage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

// Multer for Videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/videos/');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-vid-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|webm|ogg|mov|avi/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only videos are allowed (mp4, webm, ogg, mov, avi)"));
  }
});

// --- Taxonomy Routes (Categories & Tags) ---
router.get('/categories', verifyToken, taxonomyController.getCategories);
router.post('/categories', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.createCategory);
router.put('/categories/:id', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.updateCategory);
router.delete('/categories/:id', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.deleteCategory);

router.get('/tags', verifyToken, taxonomyController.getTags);
router.delete('/tags/:id', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.deleteTag);

// --- Article Routes ---
router.get('/', verifyToken, articleController.getArticles);
router.get('/view/:slug', verifyToken, articleController.getArticle);
router.get('/images/:filename', articleController.serveImage); 
router.get('/videos/:filename', articleController.serveVideo);
router.get('/attachments/:filename', articleController.serveAttachment); 
router.get('/attachments/download/:id', verifyToken, articleController.downloadAttachment);

// Specific ID route must be after more specific paths
router.get('/:id', verifyToken, articleController.getArticleById);

// Favorites
router.post('/favorites/:id', verifyToken, articleController.toggleFavorite);
router.get('/favorites/:id/status', verifyToken, articleController.getFavoriteStatus);

// Admin Actions
router.post('/', verifyToken, requireRole(['SUPER_ADMIN']), articleController.createArticle);
router.put('/:id', verifyToken, requireRole(['SUPER_ADMIN']), articleController.updateArticle);
router.delete('/:id', verifyToken, requireRole(['SUPER_ADMIN']), articleController.deleteArticle);
router.post('/upload', verifyToken, requireRole(['SUPER_ADMIN']), upload.single('image'), articleController.uploadImage);
router.post('/upload-video', verifyToken, requireRole(['SUPER_ADMIN']), videoUpload.single('video'), articleController.uploadVideo);

// Attachments Admin
router.post('/attachments/upload', verifyToken, requireRole(['SUPER_ADMIN']), attachUpload.single('file'), articleController.uploadAttachment);
router.delete('/attachments/:id', verifyToken, requireRole(['SUPER_ADMIN']), articleController.deleteAttachment);
router.patch('/attachments/:id/visibility', verifyToken, requireRole(['SUPER_ADMIN']), articleController.toggleAttachmentVisibility);

// --- Comment Routes ---
router.get('/:id/comments', verifyToken, articleController.getComments);
router.post('/:id/comments', verifyToken, articleController.createComment);
router.delete('/comments/:commentId', verifyToken, articleController.deleteComment);

module.exports = router;
