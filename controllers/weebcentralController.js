const weebcentralModel = require('../models/weebcentralModel');

class WeebCentralController {
  constructor() {
    this.model = weebcentralModel;
  }

  searchManga = async (req, res) => {
    try {
      const query = req.query.q || req.query.text;
      const page = req.query.page || 1;

      if (!query) {
        return res.status(400).json({ status: 400, error: 'Search query is required (?q=...)' });
      }

      const results = await this.model.search(query, page);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('WeebCentral Search Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getRandomManga = async (req, res) => {
    try {
      const manga = await this.model.getRandomManga();
      if (!manga) {
        return res.status(404).json({ status: 404, error: 'Random manga not found' });
      }
      res.json({ status: 200, results: [manga] });
    } catch (error) {
      console.error('WeebCentral Random Manga Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getMangaInfo = async (req, res) => {
    try {
      const { id } = req.params;
      const manga = await this.model.getMangaInfo(id);
      if (!manga) {
        return res.status(404).json({ status: 404, error: 'Manga not found' });
      }
      res.json({ status: 200, results: [manga] });
    } catch (error) {
      console.error('WeebCentral Manga Info Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getMangaChapters = async (req, res) => {
    try {
      const { id } = req.params;
      const chapters = await this.model.getChapters(id);
      res.json({ status: 200, results: chapters || [] });
    } catch (error) {
      console.error('WeebCentral Manga Chapters Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getChapterImages = async (req, res) => {
    try {
      const { chapterId } = req.params;
      const data = await this.model.getChapterImages(chapterId);
      res.json({ status: 200, results: data });
    } catch (error) {
      console.error('WeebCentral Chapter Images Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getLatestUpdates = async (req, res) => {
    try {
      const page = req.query.page || 1;
      const results = await this.model.getLatest(page);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('WeebCentral Latest Updates Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getHomePage = async (req, res) => {
    try {
      const data = await this.model.getHomePage();
      res.json({ status: 200, results: data });
    } catch (error) {
      console.error('WeebCentral Home Page Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }
}

module.exports = new WeebCentralController();
