const express = require('express');
const router = express.Router();
const mangadotController = require('../controllers/mangadotController');

router.get('/search', mangadotController.searchManga);
router.get('/manga/:id', mangadotController.getMangaInfo);
router.get('/manga/:id/chapters', mangadotController.getMangaChapters);
router.get('/manga/:id/chapters/:lang', mangadotController.getMangaChapters);
router.get('/read/:chapterId', mangadotController.getChapterImages);
router.get('/latest', mangadotController.getLatestUpdates);
router.get('/home', mangadotController.getHomePage);

module.exports = router;
