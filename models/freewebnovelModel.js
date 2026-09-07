const FreeWebNovel = require('../scrapers/freewebnovel');
const Cache = require('../utils/cache');

class FreeWebNovelModel {
  constructor() {
    this.scraper = new FreeWebNovel();
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes cache
  }

  search = async (query, page = 1) => {
    const key = `freewebnovel_search_${query}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.searchNovels(query, page)
    );
  }

  getNovelInfo = async (id) => {
    const key = `freewebnovel_info_${id}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getNovelInfo(id)
    );
  }

  getChapters = async (id, page = 1) => {
    const key = `freewebnovel_chapters_${id}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapters(id, page)
    );
  }

  getChapterContent = async (novelId, chapterId) => {
    const key = `freewebnovel_read_${novelId}_${chapterId}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getChapterContent(novelId, chapterId)
    );
  }

  getLatest = async (page = 1) => {
    const key = `freewebnovel_latest_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getLatest(page)
    );
  }

  getRanking = async (page = 1) => {
    const key = `freewebnovel_ranking_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getRanking(page)
    );
  }

  getGenres = async () => {
    const key = 'freewebnovel_genres';
    return await this.cache.wrap(
      key,
      () => this.scraper.getGenres()
    );
  }

  getNovelsByGenre = async (genre, page = 1) => {
    const key = `freewebnovel_genre_${genre}_${page}`;
    return await this.cache.wrap(
      key,
      () => this.scraper.getNovelsByGenre(genre, page)
    );
  }

  getHomePage = async () => {
    const key = 'freewebnovel_home';
    return await this.cache.wrap(
      key,
      () => this.scraper.getHomePage()
    );
  }
}

module.exports = new FreeWebNovelModel();
