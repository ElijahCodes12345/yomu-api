const scraper = require('../scrapers/mangafire');
const BaseDataProcessor = require('../utils/dataProcessor');
const Cache = require('../utils/cache');

class MangaFireModel {
  constructor() {
    this.scraper = scraper;
    this.processor = BaseDataProcessor;
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes
  }

  search = async (keyword, page = 1) => {
    const key = `mangafire_search_${keyword}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.search(keyword, page)
    );
  }

  getMangaInfo = async (id) => {
    const key = `mangafire_info_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.scrapeMangaInfo(id)
    );
  }

  scrapeMangaInfo = this.getMangaInfo;

  getChapters = async (mangaId, language) => {
    const key = `mangafire_chapters_${mangaId}_${language || 'all'}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapters(mangaId, language)
    );
  }

  getChapterImages = async (chapterId) => {
    const key = `mangafire_images_${chapterId}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapterImages(chapterId)
    );
  }

  getHomePage = async () => {
    const key = `mangafire_home`;
    return await this.cache.wrap(
      key,
      () => this.scraper.scrapeHomePage()
    );
  }

  scrapeHomePage = this.getHomePage;

  getLatestUpdates = async (pageType, page = 1) => {
    const key = `mangafire_latest_${pageType}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.scrapeLatestPage(pageType, page)
    );
  }

  scrapeLatestPage = this.getLatestUpdates;

  getCategory = async (category, page = 1) => {
    const key = `mangafire_category_${category}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.scrapeCategory(category, page)
    );
  }

  scrapeCategory = this.getCategory;

  getGenre = async (genre, page = 1) => {
    const key = `mangafire_genre_${genre}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.scrapeGenre(genre, page)
    );
  }

  scrapeGenre = this.getGenre;

  getVolumes = async (mangaId, language = 'en') => {
    const key = `mangafire_volumes_${mangaId}_${language}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getVolumes(mangaId, language)
    );
  }
}

module.exports = new MangaFireModel();
