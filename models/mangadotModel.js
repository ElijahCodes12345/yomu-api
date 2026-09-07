const MangaDot = require('../scrapers/mangadot');
const Cache = require('../utils/cache');

class MangaDotModel {
  constructor() {
    this.scraper = new MangaDot();
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes cache
  }

  search = async (query, page = 1) => {
    const key = `mangadot_search_${query}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.searchManga(query, page)
    );
  }

  getMangaInfo = async (id) => {
    const key = `mangadot_info_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getMangaInfo(id)
    );
  }

  getChapters = async (id, language = 'all') => {
    const key = `mangadot_chapters_${id}_${language}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapters(id, language)
    );
  }

  getChapterImages = async (chapterId) => {
    const key = `mangadot_read_${chapterId}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapterImages(chapterId)
    );
  }

  getLatest = async (page = 1) => {
    const key = `mangadot_latest_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getLatestUpdates(page)
    );
  }

  getHomePage = async () => {
    const key = 'mangadot_home';
    return await this.cache.wrap(
      key,
      () => this.scraper.getHomePage()
    );
  }
}

module.exports = new MangaDotModel();
