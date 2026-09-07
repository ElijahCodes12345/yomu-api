const WeebCentral = require('../scrapers/weebcentral');
const Cache = require('../utils/cache');

class WeebCentralModel {
  constructor() {
    this.scraper = new WeebCentral();
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes cache
  }

  search = async (query, page = 1) => {
    const key = `weebcentral_search_${query}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.searchManga(query, page)
    );
  }

  getMangaInfo = async (id) => {
    const key = `weebcentral_info_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getMangaInfo(id)
    );
  }

  getRandomManga = async () => {
    // Random shouldn't be cached so every call gets a new random series
    return await this.scraper.getRandomManga();
  }

  getChapters = async (id) => {
    const key = `weebcentral_chapters_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapters(id)
    );
  }

  getChapterImages = async (chapterId) => {
    const key = `weebcentral_read_${chapterId}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapterImages(chapterId)
    );
  }

  getLatest = async (page = 1) => {
    const key = `weebcentral_latest_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getLatestUpdates(page)
    );
  }

  getHomePage = async () => {
    const key = 'weebcentral_home';
    return await this.cache.wrap(
      key,
      () => this.scraper.getHomePage()
    );
  }
}

module.exports = new WeebCentralModel();
