const scraper = require('../scrapers/mangapill');
const Cache = require('../utils/cache');

class MangaPillModel {
  constructor() {
    this.scraper = new scraper();
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes
  }

  search = async (query) => {
    return await this.scraper.searchManga(query);
  }

  getMangaInfo = async (id) => {
    const key = `mangapill_info_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getMangaInfo(id)
    );
  }

  getChapters = async (id) => {
    const key = `mangapill_chapters_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapters(id)
    );
  }

  getChapterImages = async (chapterId) => {
    return await this.scraper.getChapterImages(chapterId);
  }
}

module.exports = new MangaPillModel();
