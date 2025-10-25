const express = require('express');
const router = express.Router();
const mangaPillController = require('../controllers/mangaPillController');


// Route to get trending
router.get('/trending', mangaPillController.getTrendingManga);

// Route to search
router.get('/quick-search', mangaPillController.searchManga);

// Advance route to search
router.get('/search', mangaPillController.advancedSearch);

// Route to get new manga
router.get('/new', mangaPillController.getNewManga);

// Route to get new chapters
router.get('/new-chapters', mangaPillController.getNewChapters);

// Route to get featured chapters
router.get('/featured-chapters', mangaPillController.getFeaturedChapters);

// Route to get manga details by ID
router.get('/:id/:slug?', mangaPillController.getMangaById);



// Route to get chapter content
router.get('/chapters/:id/:slug', mangaPillController.getMangaChapter);

// Route to get latest updates
router.get('/latest', mangaPillController.getLatestUpdates);

module.exports = router;