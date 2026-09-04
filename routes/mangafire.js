const express = require('express');
const router = express.Router();
const mangafireController = require('../controllers/mangafireController');

// Specific endpoints first
router.get('/search', mangafireController.searchManga);
router.get('/browse', mangafireController.browseManga);
router.get('/filter-options', mangafireController.getFilterOptions);
router.get('/random', mangafireController.getRandomManga);
router.get('/home', mangafireController.getHomePage);

// Manga detail and chapter routes
router.get('/manga/:id', mangafireController.getMangaInfo);
router.get('/manga/:id/languages', mangafireController.getMangaLanguages);
router.get('/manga/:id/chapters', mangafireController.getMangaChapters);
router.get('/manga/:id/chapters/:lang', mangafireController.getMangaChapters);

// Reader & Categories
router.get('/read/:chapterId', mangafireController.getChapterImages);
router.get('/genre/:genre', mangafireController.getGenre);
router.get('/category/:category', mangafireController.getCategory);
router.get('/volumes/:id/:lang?', mangafireController.getVolumes);

// Parametric fallback (e.g. /updated, /newest, /added)
router.get('/:pageType', mangafireController.getLatestUpdates);

module.exports = router;