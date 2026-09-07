const NovelFire = require('../scrapers/novelfire');
const Cache = require('../utils/cache');

class NovelFireModel {
  constructor() {
    this.scraper = new NovelFire();
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes cache
  }

  search = async (query, page = 1) => {
    const key = `novelfire_search_${query}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.searchNovels(query, page)
    );
  }

  getNovelInfo = async (id) => {
    const key = `novelfire_info_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getNovelInfo(id)
    );
  }

  getChapters = async (id, page = 1) => {
    const key = `novelfire_chapters_${id}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapters(id, page)
    );
  }

  getChapterContent = async (novelId, chapterId) => {
    const key = `novelfire_read_${novelId}_${chapterId}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapterContent(novelId, chapterId)
    );
  }

  getLatest = async (page = 1) => {
    const key = `novelfire_latest_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getLatest(page)
    );
  }

  getRanking = async (page = 1) => {
    const key = `novelfire_ranking_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getRanking(page)
    );
  }

  getGenres = async () => {
    const key = 'novelfire_genres';
    return await this.cache.wrap(
      key,
      () => this.scraper.getGenres()
    );
  }

  getNovelsByGenre = async (genre, page = 1) => {
    const key = `novelfire_genre_${genre}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getNovelsByGenre(genre, page)
    );
  }

  getHomePage = async () => {
    const key = 'novelfire_home';
    return await this.cache.wrap(
      key,
      () => this.scraper.getHomePage()
    );
  }
}

module.exports = new NovelFireModel();
