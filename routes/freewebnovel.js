const express = require('express');
const router = express.Router();
const freewebnovelController = require('../controllers/freewebnovelController');

router.get('/search', freewebnovelController.searchNovels);
router.get('/novel/:id', freewebnovelController.getNovelInfo);
router.get('/novel/:id/chapters', freewebnovelController.getNovelChapters);
router.get('/read/:novelId/:chapterId', freewebnovelController.getChapterContent);
router.get('/latest', freewebnovelController.getLatest);
router.get('/ranking', freewebnovelController.getRanking);
router.get('/genres', freewebnovelController.getGenres);
router.get('/genre/:genre', freewebnovelController.getNovelsByGenre);
router.get('/home', freewebnovelController.getHomePage);

module.exports = router;
