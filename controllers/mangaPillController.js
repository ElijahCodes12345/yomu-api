const MangaPillModel = require('../models/mangaPillModel');

class MangaPillController {
  constructor() {
    this.model = MangaPillModel;
  }

  searchManga = async (req, res) => {
    try {
      const { q } = req.query;
      const results = await this.model.search(q);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      res.status(500).json({ status: 500, error: error.message });
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
      res.status(500).json({ status: 500, error: error.message });
    }
  }

  getMangaChapters = async (req, res) => {
    try {
      const { id } = req.params;
      const chapters = await this.model.getChapters(id);
      res.json({ status: 200, results: chapters || [] });
    } catch (error) {
      res.status(500).json({ status: 500, error: error.message });
    }
  }

  getChapterImages = async (req, res) => {
    try {
      const { chapterId } = req.params;
      const images = await this.model.getChapterImages(chapterId);
      res.json({ status: 200, results: images || [] });
    } catch (error) {
      res.status(500).json({ status: 500, error: error.message });
    }
  }
}

module.exports = new MangaPillController();
