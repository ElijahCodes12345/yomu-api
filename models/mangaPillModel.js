const MangaPill = require('../scrapers/mangapill');
const BaseDataProcessor = require('../utils/dataProcessor');
const Cache = require('../utils/cache');

class MangaPillModel {
  constructor() {
    this.scraper = new MangaPill();
    this.processor = BaseDataProcessor;
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes
  }

  searchManga = async (query) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }
    
    const key = `search_${query.trim().toLowerCase()}`;
    const rawResults = await this.cache.wrap(
      key, 
      this.scraper.searchManga.bind(this.scraper), 
      query.trim()
    );
    
    return this.processSearchResults(rawResults);
  }

  getMangaById = async (id) => {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
    
    const validatedId = this.processor.validateId(id);
    const key = `manga_${validatedId}`;
    const rawManga = await this.cache.wrap(
      key,
      this.scraper.getMangaById.bind(this.scraper),
      validatedId
    );
    
    return this.processMangaDetails(rawManga);
  }

  getMangaChapter = async (mangaId, chapterId) => {
    if (!chapterId || typeof chapterId !== 'string' || chapterId.trim().length === 0) {
      throw new Error('Chapter ID must be a non-empty string');
    }
    
    const validatedChapterId = this.processor.validateId(chapterId);
    const key = `chapter_${validatedChapterId}`;
    const rawChapter = await this.cache.wrap(
      key,
      this.scraper.getMangaChapter.bind(this.scraper),
      validatedChapterId
    );
    
    return this.processChapterContent({
      ...rawChapter,
      mangaId: mangaId || rawChapter.mangaId
    });
  }

  getTrendingManga = async () => {
    const key = 'trending_manga';
    const rawTrending = await this.cache.wrap(
      key,
      this.scraper.getTrendingManga.bind(this.scraper)
    );
    
    return this.processTrendingManga(rawTrending);
  }

  advancedSearch = async (query, filters = {}) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }
    
    const key = `advanced_search_${query.trim().toLowerCase()}_${JSON.stringify(filters)}`;
    const result = await this.cache.wrap(
      key,
      this.scraper.advancedSearch.bind(this.scraper),
      query.trim(),
      filters
    );
    
    if (result && result.results) {
      return {
        results: this.processSearchResults(result.results),
        pagination: result.pagination || null
      };
    }
    
    return result;
  }

  getNewManga = async () => {
    const key = 'new_manga';
    const rawNewManga = await this.cache.wrap(
      key,
      this.scraper.getNewManga.bind(this.scraper)
    );
    
    return this.processMangaList(rawNewManga);
  }

  getLatest = async () => {
    const key = 'mangapill_latest';
    const rawNewChapters = await this.cache.wrap(
      key,
      this.scraper.getLatest.bind(this.scraper)
    );
    
    return this.processLatestUpdates(rawNewChapters);
  }

  getFeaturedChapters = async () => {
    const key = 'featured_chapters';
    const rawFeaturedChapters = await this.cache.wrap(
      key,
      this.scraper.getFeaturedChapters.bind(this.scraper)
    );
    
    return this.processFeaturedChapters(rawFeaturedChapters);
  }

  processMangaList(mangaList) {
    if (!Array.isArray(mangaList)) return [];
    return mangaList.map(manga => ({
      id: this.processor.validateId(manga.id),
      title: this.processor.sanitizeText(manga.title),
      alternateTitle: this.processor.sanitizeText(manga.alternateTitle) || null,
      cover: manga.cover || null,
      url: manga.url || null,
      type: this.processor.sanitizeText(manga.type) || null,
      year: this.processor.sanitizeText(manga.year) || null,
      status: this.processor.sanitizeText(manga.status) || null
    }));
  }

  processSearchResults(results) {
    if (!Array.isArray(results)) return [];
    return results.map(result => ({
      id: this.processor.validateId(result.id),
      title: this.processor.sanitizeText(result.title),
      alternateTitle: this.processor.sanitizeText(result.alternateTitle) || null,
      cover: result.cover || null,
      url: result.url || null,
      type: this.processor.sanitizeText(result.type) || null,
      year: this.processor.sanitizeText(result.year) || null,
      status: this.processor.sanitizeText(result.status) || null
    }));
  }

  processMangaDetails(manga) {
    if (!manga) return null;
    return {
      id: this.processor.validateId(manga.id),
      title: this.processor.sanitizeText(manga.title),
      alternateTitle: this.processor.sanitizeText(manga.alternateTitle) || null,
      cover: manga.cover || null,
      description: this.processor.sanitizeText(manga.description) || null,
      genres: Array.isArray(manga.genres) 
        ? manga.genres.map(genre => this.processor.sanitizeText(genre)) 
        : [],
      type: this.processor.sanitizeText(manga.type) || null,
      status: this.processor.sanitizeText(manga.status) || null,
      year: this.processor.sanitizeText(manga.year) || null,
      chapters: Array.isArray(manga.chapters)
        ? manga.chapters.map(chapter => ({
            id: this.processor.validateId(chapter.id),
            title: this.processor.sanitizeText(chapter.title),
            url: chapter.url || ''
          }))
        : [],
      url: manga.url || null
    };
  }

  processChapterContent(chapter) {
    if (!chapter) return null;
    return {
      id: this.processor.validateId(chapter.id) || null,
      title: this.processor.sanitizeText(chapter.title) || null,
      mangaId: this.processor.validateId(chapter.mangaId) || null,
      pages: Array.isArray(chapter.pages)
        ? chapter.pages.filter(page => page && typeof page === 'string').map(page => page.trim())
        : [],
      url: chapter.url || null,
      prevUrl: chapter.prevUrl || null,
      nextUrl: chapter.nextUrl || null,
    };
  }

  processTrendingManga(trending) {
    if (!Array.isArray(trending)) return [];
    return trending.map(manga => ({
      id: this.processor.validateId(manga.id),
      title: this.processor.sanitizeText(manga.title),
      alternateTitle: this.processor.sanitizeText(manga.alternateTitle) || null,
      cover: manga.cover || null,
      url: manga.url || null,
      type: this.processor.sanitizeText(manga.type) || null,
      year: this.processor.sanitizeText(manga.year) || null,
      status: this.processor.sanitizeText(manga.status) || null
    }));
  }

  processLatestUpdates(updates) {
    if (!Array.isArray(updates)) return [];
    return updates.map(update => ({
      chapterId: this.processor.validateId(update.chapterId),
      title: this.processor.sanitizeText(update.title) || null,
      alternateTitle: this.processor.sanitizeText(update.alternateTitle) || null,
      chapterNumber: update.chapterNumber || null,
      id: this.processor.validateId(update.id),
      date: update.date || null,
      chapterUrl: update.chapterUrl || null,
      url: update.url || null,
    }));
  }

  processFeaturedChapters(featuredChapters) {
    if (!Array.isArray(featuredChapters)) return [];
    return featuredChapters.map(item => ({
      id: this.processor.validateId(item.id),
      title: this.processor.sanitizeText(item.title),
      chapterId: this.processor.validateId(item.chapterId),
      chapterNumber: this.processor.sanitizeText(item.chapterNumber) || null,
      cover: item.cover || null,
      chapterUrl: item.chapterUrl || null,
      url: item.url || null
    }));
  }
}

module.exports = MangaPillModel;