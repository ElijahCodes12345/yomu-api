const FlameComicsModel = require('../models/flamecomicsModel');

class FlameComicsController {
  constructor() {
    this.model = new FlameComicsModel();
  }

  // Search manga by title on FlameComics
  searchManga = async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ 
          status: 400,
          error: 'Query parameter "q" is required' 
        });
      }
      const results = await this.model.searchManga(q);
      res.json({
        status: 200,
        results: results || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  advancedSearch = async (req, res) => {
    try {
      const { q, type, status, genre, page} = req.query;
      if (!q) {
        return res.status(400).json({ 
          status: 400,
          error: 'Query parameter "q" is required' 
        });
      }
      const result = await this.model.advancedSearch(q, { type, status, genre, page: page ? parseInt(page) : 1 });

      res.json({
        status: 200,
        results: result.results || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get manga by ID from FlameComics
  getMangaById = async (req, res) => {
    try {
      const { id } = req.params;
      const manga = await this.model.getMangaById(id);
      if (!manga) {
        return res.status(404).json({ 
          status: 404,
          error: 'Manga not found' 
        });
      }
      res.json({
        status: 200,
        results: [manga]
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get novel by ID from FlameComics
  getNovelById = async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await this.model.getNovelById(id);
      if (!novel) {
        return res.status(404).json({ 
          status: 404,
          error: 'Novel not found' 
        });
      }
      res.json({
        status: 200,
        results: [novel]
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  getMangaChapter = async (req, res) => {
    try {
      const { mangaId, token } = req.params;
      const chapter = await this.model.getMangaChapter(mangaId, token);
      if (!chapter) {
        return res.status(404).json({ 
          status: 404,
          error: 'Chapter not found' 
        });
      }
      res.json({
        status: 200,
        results: [chapter]
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  getPopularManga = async (req, res) => {
    try {
      // model.getPopularManga now returns { popularEntries: { blocks: [...] } }
      const popularManga = await this.model.getPopularManga();
      res.json({
        status: 200,
        results: popularManga || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get new manga from FlameComics
  getNewManga = async (req, res) => {
    try {
      const newManga = await this.model.getNewManga();
      res.json({
        status: 200,
        results: newManga || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get latest chapters from FlameComics
  getLatest = async (req, res) => {
    try {
      const latest = await this.model.getLatest();
      res.json({
        status: 200,
        results: latest || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  getStaffPicks = async (req, res) => {
    try {
      const staffPicks = await this.model.getStaffPicks();
      res.json({
        status: 200,
        results: staffPicks || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  getNovels = async (req, res) => {
    try {
      const novels = await this.model.getNovels();
      res.json({
        status: 200,
        results: novels || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }
}

module.exports = new FlameComicsController();