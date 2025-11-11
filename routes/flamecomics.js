const express = require('express');
const router = express.Router();
const flameComicsController = require('../controllers/flamecomicsController');

// Search
router.get('/search', flameComicsController.searchManga);

// Advanced search
router.get('/advanced-search', flameComicsController.advancedSearch);

// Get manga by ID
router.get('/manga/:id', flameComicsController.getMangaById);

// Get manga chapter
router.get('/manga/:mangaId/chapter/:token', flameComicsController.getMangaChapter);

// Get novel by ID
router.get('/novel/:id', flameComicsController.getNovelById);

// Get popular manga
router.get('/popular', flameComicsController.getPopularManga);

// Get new manga
router.get('/new-manga', flameComicsController.getNewManga);

// Get latest chapters
router.get('/latest', flameComicsController.getLatest);

// Get staff picks
router.get('/staff-picks', flameComicsController.getStaffPicks);

// Get novels
router.get('/novels', flameComicsController.getNovels);

module.exports = router;