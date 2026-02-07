const scraper = require('../models/mangafireModel');

const searchManga = async (req, res) => {
    try {
        const query = req.query.q;
        const page = req.query.page || 1;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const results = await scraper.search(query, page);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getMangaInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const info = await scraper.scrapeMangaInfo(id);
        res.json(info);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getMangaChapters = async (req, res) => {
    try {
        const { id, lang } = req.params;
        // Prioritize path param if present, else query param
        const language = lang || req.query.lang;
        const chapters = await scraper.getChapters(id, language);
        res.json(chapters);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getChapterImages = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const images = await scraper.getChapterImages(chapterId);
        res.json(images);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getHomePage = async (req, res) => {
    try {
        const data = await scraper.scrapeHomePage();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getLatestUpdates = async (req, res) => {
    try {
        const { pageType } = req.params;
        const page = req.query.page || 1;
        
        // Valid options: updated, newest, added
        const validTypes = ['updated', 'newest', 'added'];
        const type = validTypes.includes(pageType) ? pageType : 'updated';
        
        const data = await scraper.scrapeLatestPage(type, page);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const page = req.query.page || 1;
        const data = await scraper.scrapeCategory(category, page);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getGenre = async (req, res) => {
    try {
        const { genre } = req.params;
        const page = req.query.page || 1;
        const data = await scraper.scrapeGenre(genre, page);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

const getVolumes = async (req, res) => {
    try {
        const { id, lang } = req.params;
        const language = lang || req.query.lang || 'en';
        const volumes = await scraper.getVolumes(id, language);
        res.json(volumes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    searchManga,
    getMangaInfo,
    getMangaChapters,
    getChapterImages,
    getHomePage,
    getLatestUpdates,
    getCategory,
    getGenre,
    getVolumes
};
