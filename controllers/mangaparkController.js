const MangaparkModel = require('../models/mangaparkModel');

class MangaparkController {
  constructor() {
    this.model = new MangaparkModel();
  }

  // Search manga by title on MangaPark
  searchManga = async (req, res) => {
    try {
      const { q, page = 1, size = 10 } = req.query;
      if (!q) {
        return res.status(400).json({ 
          status: 400,
          error: 'Query parameter "q" is required' 
        });
      }
      
      const result = await this.model.searchManga(q, parseInt(page), parseInt(size));
      
      res.json({
        status: 200,
        results: result.results || [],
        pagination: result.pagination || null
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
      const {
        q,
        genres_include,
        genres_exclude,
        page,
        size,
        sortby,
        orig,
        lang,
        status,
        upload
      } = req.query;


      let parsed_genres_include = [];
      if (genres_include) {
        if (typeof genres_include === 'string') {
          parsed_genres_include = genres_include.split(',').map(genre => genre.trim());
        } else if (Array.isArray(genres_include)) {
          parsed_genres_include = genres_include.map(genre => genre.trim());
        }
      }

      let parsed_genres_exclude = [];
      if (genres_exclude) {
        if (typeof genres_exclude === 'string') {
          parsed_genres_exclude = genres_exclude.split(',').map(genre => genre.trim());
        } else if (Array.isArray(genres_exclude)) {
          parsed_genres_exclude = genres_exclude.map(genre => genre.trim());
        }
      }

      const filters = {
        genres_include: parsed_genres_include,
        genres_exclude: parsed_genres_exclude,
        page: page ? parseInt(page) : 1,
        size: size ? parseInt(size) : 10,
        sortby: sortby || 'field_score',
        orig: orig || '',
        lang: lang || '',
        status: status || '',
        upload: upload || ''
      };

      const result = await this.model.advancedSearch(q, filters);

      res.json({
        status: 200,
        results: result.results || [],
        pagination: result.pagination || null
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        error: error.message
      });
    }
  }

  // Get manga by ID from MangaPark
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

  // Get chapter content from MangaPark
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

  // Get popular manga from MangaPark
  getPopularManga = async (req, res) => {
    try {
      const { page = 1, size = 24 } = req.query;
      const result = await this.model.getPopularManga(parseInt(page), parseInt(size));
      
      res.json({
        status: 200,
        results: result.results || [],
        pagination: result.pagination || null
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get new manga from MangaPark
  getNewManga = async (req, res) => {
    try {
      const { page = 1, size = 36 } = req.query;
      const result = await this.model.getNewManga(parseInt(page), parseInt(size));
      
      res.json({
        status: 200,
        results: result.results || [],
        pagination: result.pagination || null
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  // Get latest chapters from MangaPark
  getLatest = async (req, res) => {
    try {
      const { page = 1, size = 36 } = req.query;
      const result = await this.model.getLatest(parseInt(page), parseInt(size));
      
      res.json({
        status: 200,
        results: result.results || [],
        pagination: result.pagination || null
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }

  getLatestAnime = async (req, res) => {
    try {
      const latestAnime = await this.model.getLatestAnime();
      res.json({
        status: 200,
        results: latestAnime || []
      });
    } catch (error) {
      res.status(500).json({ 
        status: 500,
        error: error.message 
      });
    }
  }
}

module.exports = new MangaparkController();