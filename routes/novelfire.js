const express = require('express');
const router = express.Router();
const novelfireController = require('../controllers/novelfireController');

router.get('/search', novelfireController.searchNovels);
router.get('/novel/:id', novelfireController.getNovelInfo);
router.get('/novel/:id/chapters', novelfireController.getNovelChapters);
router.get('/read/:novelId/:chapterId', novelfireController.getChapterContent);
router.get('/latest', novelfireController.getLatest);
router.get('/ranking', novelfireController.getRanking);
router.get('/genres', novelfireController.getGenres);
router.get('/genre/:genre', novelfireController.getNovelsByGenre);
router.get('/home', novelfireController.getHomePage);

module.exports = router;
