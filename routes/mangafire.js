const express = require('express');
const router = express.Router();
const mangafireController = require('../controllers/mangafireController');

router.get('/search/:query', mangafireController.searchManga);
router.get('/manga/:id', mangafireController.getMangaInfo);
router.get('/manga/:id/chapters', mangafireController.getMangaChapters);
// Supporting path param as well for compatibility or user preference if they want strict path structures
router.get('/manga/:id/chapters/:lang', mangafireController.getMangaChapters);
router.get('/genre/:genre', mangafireController.getGenre);
router.get('/read/:chapterId', mangafireController.getChapterImages);
router.get('/home', mangafireController.getHomePage);
router.get('/category/:category', mangafireController.getCategory);
router.get('/volumes/:id/:lang?', mangafireController.getVolumes);
router.get('/:pageType', mangafireController.getLatestUpdates);

module.exports = router;
 