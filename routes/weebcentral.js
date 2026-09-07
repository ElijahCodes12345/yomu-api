const express = require('express');
const router = express.Router();
const weebcentralController = require('../controllers/weebcentralController');

router.get('/search', weebcentralController.searchManga);
router.get('/random', weebcentralController.getRandomManga);
router.get('/manga/:id', weebcentralController.getMangaInfo);
router.get('/manga/:id/chapters', weebcentralController.getMangaChapters);
router.get('/read/:chapterId', weebcentralController.getChapterImages);
router.get('/latest', weebcentralController.getLatestUpdates);
router.get('/home', weebcentralController.getHomePage);

module.exports = router;
