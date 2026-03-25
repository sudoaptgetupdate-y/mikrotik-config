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

// --- Taxonomy Routes ---
router.get('/categories', verifyToken, taxonomyController.getCategories);
router.post('/categories', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.createCategory);
router.put('/categories/:id', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.updateCategory);
router.delete('/categories/:id', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.deleteCategory);

router.get('/tags', verifyToken, taxonomyController.getTags);
router.delete('/tags/:id', verifyToken, requireRole(['SUPER_ADMIN']), taxonomyController.deleteTag);

// --- Article Routes ---
router.get('/', verifyToken, articleController.getArticles);
router.get('/view/:slug', verifyToken, articleController.getArticle);
router.get('/images/:filename', articleController.serveImage); // Publicly accessible

// Favorites
router.post('/favorites/:id', verifyToken, articleController.toggleFavorite);
router.get('/favorites/:id/status', verifyToken, articleController.getFavoriteStatus);

// Super Admin Only
router.post('/', verifyToken, requireRole(['SUPER_ADMIN']), articleController.createArticle);
router.put('/:id', verifyToken, requireRole(['SUPER_ADMIN']), articleController.updateArticle);
router.delete('/:id', verifyToken, requireRole(['SUPER_ADMIN']), articleController.deleteArticle);
router.post('/upload', verifyToken, requireRole(['SUPER_ADMIN']), upload.single('image'), articleController.uploadImage);

// --- Comment Routes ---
router.get('/:id/comments', verifyToken, articleController.getComments);
router.post('/:id/comments', verifyToken, articleController.createComment);
router.delete('/comments/:commentId', verifyToken, articleController.deleteComment);

module.exports = router;
