const express = require('express');
const router = express.Router();
const mangaparkController = require('../controllers/mangaparkController');

// Search
router.get('/search', mangaparkController.searchManga);

// Advanced search
router.get('/advanced-search', mangaparkController.advancedSearch);

// Get manga by ID
router.get('/manga/:id', mangaparkController.getMangaById);

// Get manga chapter
router.get('/manga/:mangaId/chapter/:token', mangaparkController.getMangaChapter);

// Get popular manga
router.get('/popular', mangaparkController.getPopularManga);

// Get new manga
router.get('/new-manga', mangaparkController.getNewManga);

// Get latest chapters
router.get('/latest', mangaparkController.getLatest);

// Get latest anime
router.get('/latest-anime', mangaparkController.getLatestAnime);

module.exports = router;