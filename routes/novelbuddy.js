const express = require('express');
const router = express.Router();
const novelbuddyController = require('../controllers/novelbuddyController');

router.get('/search', novelbuddyController.searchNovels);
router.get('/novel/:id', novelbuddyController.getNovelInfo);
router.get('/novel/:id/chapters', novelbuddyController.getNovelChapters);
router.get('/read/:novelId/:chapterId', novelbuddyController.getChapterContent);
router.get('/latest', novelbuddyController.getLatest);
router.get('/popular', novelbuddyController.getPopular);
router.get('/ranking', novelbuddyController.getRanking);
router.get('/genres', novelbuddyController.getGenres);
router.get('/genre/:genre', novelbuddyController.getNovelsByGenre);
router.get('/home', novelbuddyController.getHomePage);

module.exports = router;
