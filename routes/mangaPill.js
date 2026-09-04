const express = require('express');
const router = express.Router();
const mangaPillController = require('../controllers/mangaPillController');

router.get('/search', mangaPillController.searchManga);
router.get('/manga/:id', mangaPillController.getMangaInfo);
router.get('/manga/:id/chapters', mangaPillController.getMangaChapters);
router.get('/read/:chapterId', mangaPillController.getChapterImages);

module.exports = router;
