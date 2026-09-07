const novelbuddyModel = require('../models/novelbuddyModel');

class NovelBuddyController {
  constructor() {
    this.model = novelbuddyModel;
  }

  searchNovels = async (req, res) => {
    try {
      const query = req.query.q || req.query.text;
      const page = req.query.page || 1;

      if (!query) {
        return res.status(400).json({ status: 400, error: 'Search query is required (?q=...)' });
      }

      const results = await this.model.search(query, page);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('NovelBuddy Search Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getNovelInfo = async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await this.model.getNovelInfo(id);
      if (!novel) {
        return res.status(404).json({ status: 404, error: 'Novel not found' });
      }
      res.json({ status: 200, results: [novel] });
    } catch (error) {
      console.error('NovelBuddy Novel Info Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getNovelChapters = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await this.model.getChapters(id);
      res.json({ status: 200, results: data });
    } catch (error) {
      console.error('NovelBuddy Novel Chapters Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getChapterContent = async (req, res) => {
    try {
      const { novelId, chapterId } = req.params;
      const data = await this.model.getChapterContent(novelId, chapterId);
      res.json({ status: 200, results: data });
    } catch (error) {
      console.error('NovelBuddy Chapter Content Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getLatest = async (req, res) => {
    try {
      const page = req.query.page || 1;
      const results = await this.model.getLatest(page);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('NovelBuddy Latest Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getPopular = async (req, res) => {
    try {
      const page = req.query.page || 1;
      const results = await this.model.getPopular(page);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('NovelBuddy Popular Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getRanking = async (req, res) => {
    try {
      const page = req.query.page || 1;
      const results = await this.model.getRanking(page);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('NovelBuddy Ranking Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getGenres = async (req, res) => {
    try {
      const results = await this.model.getGenres();
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('NovelBuddy Genres Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getNovelsByGenre = async (req, res) => {
    try {
      const { genre } = req.params;
      const page = req.query.page || 1;
      const results = await this.model.getNovelsByGenre(genre, page);
      res.json({ status: 200, results: results || [] });
    } catch (error) {
      console.error('NovelBuddy Novels by Genre Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }

  getHomePage = async (req, res) => {
    try {
      const data = await this.model.getHomePage();
      res.json({ status: 200, results: data });
    } catch (error) {
      console.error('NovelBuddy Home Page Error:', error);
      res.status(500).json({ status: 500, error: error.message || 'Internal Server Error' });
    }
  }
}

module.exports = new NovelBuddyController();
