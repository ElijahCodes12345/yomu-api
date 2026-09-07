const NovelBuddy = require('../scrapers/novelbuddy');
const Cache = require('../utils/cache');

class NovelBuddyModel {
  constructor() {
    this.scraper = new NovelBuddy();
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes cache
  }

  search = async (query, page = 1) => {
    const key = `novelbuddy_search_${query}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.searchNovels(query, page)
    );
  }

  getNovelInfo = async (id) => {
    const key = `novelbuddy_info_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getNovelInfo(id)
    );
  }

  getChapters = async (id) => {
    const key = `novelbuddy_chapters_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapters(id)
    );
  }

  getChapterContent = async (novelSlug, chapterSlug) => {
    const key = `novelbuddy_read_${novelSlug}_${chapterSlug}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapterContent(novelSlug, chapterSlug)
    );
  }

  getLatest = async (page = 1) => {
    const key = `novelbuddy_latest_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getLatest(page)
    );
  }

  getPopular = async (page = 1) => {
    const key = `novelbuddy_popular_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getPopular(page)
    );
  }

  getRanking = async (page = 1) => {
    const key = `novelbuddy_ranking_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getRanking(page)
    );
  }

  getGenres = async () => {
    const key = 'novelbuddy_genres';
    return await this.cache.wrap(
      key,
      () => this.scraper.getGenres()
    );
  }

  getNovelsByGenre = async (genre, page = 1) => {
    const key = `novelbuddy_genre_${genre}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getNovelsByGenre(genre, page)
    );
  }

  getHomePage = async () => {
    const key = 'novelbuddy_home';
    return await this.cache.wrap(
      key,
      () => this.scraper.getHomePage()
    );
  }
}

module.exports = new NovelBuddyModel();
