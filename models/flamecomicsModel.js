const FlameComics = require('../scrapers/flamecomics');
const BaseDataProcessor = require('../utils/dataProcessor');
const Cache = require('../utils/cache');

class FlameComicsModel {
  constructor() {
    this.scraper = new FlameComics();
    this.processor = BaseDataProcessor;
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes
  }

  searchManga = async (query) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    const key = `flame_search_${query.trim().toLowerCase()}`;
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
    const key = `flame_manga_${validatedId}`;
    const rawManga = await this.cache.wrap(
      key,
      this.scraper.getMangaById.bind(this.scraper),
      validatedId
    );
    
    return this.processMangaDetails(rawManga);
  }

  getNovelById = async (id) => {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
    
    const validatedId = this.processor.validateId(id);
    const key = `flame_novel_${validatedId}`;
    const rawNovel = await this.cache.wrap(
      key,
      this.scraper.getNovelById.bind(this.scraper),
      validatedId
    );
    
    return this.processNovelDetails(rawNovel);
  };

  getMangaChapter = async (mangaId, token) => {
    if (!mangaId || !token || typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('Both mangaId and token are required');
    }
    
    const key = `flame_chapter_${mangaId}_${token}`;
    const rawChapter = await this.cache.wrap(
      key,
      () => this.scraper.getMangaChapter(mangaId, token)
    );
    
    if (!rawChapter) return null;

    // Pass all fields, but sanitize title
    return {
      ...rawChapter,
      title: this.processor.sanitizeText(rawChapter.title)
    };
  }

  getPopularManga = async () => {
    const key = 'flame_popular_entries';
    const rawPopular = await this.cache.wrap(
      key,
      this.scraper.getPopularManga.bind(this.scraper)
    );

    if (rawPopular && rawPopular.popularEntries && Array.isArray(rawPopular.popularEntries.blocks)) {
      const mergedSeries = [];
      for (const block of rawPopular.popularEntries.blocks) {
        for (const s of block.series || []) {
          mergedSeries.push({
            id: s.series_id || s.id,
            title: this.processor.sanitizeText(s.title) || null,
            likes: typeof s.likes === 'number' ? s.likes : (parseInt(s.likes, 10) || 0),
            status: s.status || null,
            cover: s.cover || null,
            country: s.country || null,
            language: s.language || null,
            type: s.type || null,
            last_edit: s.last_edit || s.lastEdit || null,
            time: s.time || s.updated || null
          });
        }
      }

      return mergedSeries;
    }

    return [];
  }

  advancedSearch = async (query, filters = {}) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }
    
    const key = `flame_advanced_search_${query.trim().toLowerCase()}_${JSON.stringify(filters)}`;
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
    const key = 'flame_new_manga';
    const rawNewManga = await this.cache.wrap(
      key,
      this.scraper.getNewManga.bind(this.scraper)
    );
    
    return this.processMangaList(rawNewManga);
  }

  getLatest = async () => {
    const key = 'flame_latest';
    const rawLatest = await this.cache.wrap(
      key,
      this.scraper.getLatest.bind(this.scraper)
    );

    // Flatten blocks -> series[] so API returns a single list of series (each with chapters)
    if (rawLatest && rawLatest.latestEntries && Array.isArray(rawLatest.latestEntries.blocks)) {
      const mergedSeries = [];
      for (const block of rawLatest.latestEntries.blocks) {
        for (const s of block.series || []) {
          mergedSeries.push({
            id: s.series_id || s.id,
            title: this.processor.sanitizeText(s.title) || null,
            likes: typeof s.likes === 'number' ? s.likes : (parseInt(s.likes, 10) || 0),
            status: s.status || null,
            cover: s.cover || null,
            country: s.country || null,
            language: s.language || null,
            type: s.type || null,
            last_edit: s.last_edit || s.lastEdit || null,
            time: s.time || s.updated || null,
            chapters: Array.isArray(s.chapters)
              ? s.chapters.map(ch => ({
                  id: s.series_id || s.id,
                  chapter: ch.chapter || null,
                  title: this.processor.sanitizeText(ch.title) || null,
                  language: ch.language || null,
                  release_date: ch.release_date || null,
                  token: ch.token || null
                }))
              : []
          });
        }
      }

      return mergedSeries;
    }

    return [];
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

  processSearchResults(data) {
    if (!data || !Array.isArray(data)) return [];
    return data.map(result => ({
      id: Number(result.id) || null,
      title: this.processor.sanitizeText(result.title),
      language: result.language || null,
      type: this.processor.sanitizeText(result.type) || null,
      country: result.country || null,
      status: this.processor.sanitizeText(result.status) || null,
      cover: result.cover || null,
      likes: result.likes || 0,
      last_edit: result.last_edit || null,
      updated: result.updated || null
    }));
  }

  processMangaDetails(manga) {
    if (!manga) return null;
    return {
      id: Number(manga.id) || null,
      title: this.processor.sanitizeText(manga.title),
      altTitles: Array.isArray(manga.altTitles) ? manga.altTitles : [],
      description: this.processor.sanitizeText(manga.description) || null,
      language: manga.language || null,
      type: this.processor.sanitizeText(manga.type) || null,
      tags: Array.isArray(manga.tags) ? manga.tags.map(tag => this.processor.sanitizeText(tag)) : [],
      country: manga.country || null,
      author: Array.isArray(manga.author) ? manga.author : [],
      artist: Array.isArray(manga.artist) ? manga.artist : [],
      status: this.processor.sanitizeText(manga.status) || null,
      cover: manga.cover || null,
      chapters: Array.isArray(manga.chapters) ? manga.chapters.map(chapter => ({
        chapter_id: chapter.chapter_id,
        chapter: chapter.chapter || null,
        title: this.processor.sanitizeText(chapter.title) || null,
        release_date: chapter.release_date,
        token: chapter.token,
        url: chapter.url
      })) : []
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

  processPopularManga(manga) {
    if (!Array.isArray(manga)) return [];
    return manga.map(item => ({
      id: this.processor.validateId(item.id),
      title: this.processor.sanitizeText(item.title),
      cover: item.cover || null,
      url: item.url || null,
      type: this.processor.sanitizeText(item.type) || null,
      year: this.processor.sanitizeText(item.year) || null,
      status: this.processor.sanitizeText(item.status) || null
    }));
  }

  processNovelDetails(novel) {
    if (!novel) return null;
    return {
      id: Number(novel.id) || null,
      title: this.processor.sanitizeText(novel.title),
      altTitles: Array.isArray(novel.altTitles) ? novel.altTitles : [],
      description: this.processor.sanitizeText(novel.description) || null,
      language: novel.language || null,
      type: this.processor.sanitizeText(novel.type) || null,
      tags: Array.isArray(novel.tags) ? novel.tags.map(tag => this.processor.sanitizeText(tag)) : [],
      country: novel.country || null,
      author: Array.isArray(novel.author) ? novel.author : [],
      publisher: Array.isArray(novel.publisher) ? novel.publisher : [],
      year: novel.year || null,
      status: this.processor.sanitizeText(novel.status) || null,
      cover: novel.cover || null,
      chapters: Array.isArray(novel.chapters) ? novel.chapters.map(chapter => ({
        chapter_id: chapter.chapter_id,
        chapter: chapter.chapter || null,
        title: this.processor.sanitizeText(chapter.title) || null,
        release_date: chapter.release_date,
        token: chapter.token,
        url: chapter.url
      })) : []
    };
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

  getStaffPicks = async () => {
    const key = 'flame_staff_picks';
    const rawStaffPicks = await this.cache.wrap(
      key,
      this.scraper.getStaffPicks.bind(this.scraper)
    );

    // Handle the staff picks data similarly to popularManga with flattening
    if (rawStaffPicks && rawStaffPicks.staffPicks && Array.isArray(rawStaffPicks.staffPicks.blocks)) {
      const mergedSeries = [];
      for (const block of rawStaffPicks.staffPicks.blocks) {
        for (const s of block.series || []) {
          mergedSeries.push({
            id: s.series_id || s.id,
            title: this.processor.sanitizeText(s.title) || null,
            likes: typeof s.likes === 'number' ? s.likes : (parseInt(s.likes, 10) || 0),
            status: s.status || null,
            cover: s.cover || null,
            country: s.country || null,
            language: s.language || null,
            type: s.type || null,
            last_edit: s.last_edit || s.lastEdit || null,
            time: s.time || s.updated || null
          });
        }
      }

      return mergedSeries;
    }

    return [];
  }

  getNovels = async () => {
    const key = 'flame_novels';
    const rawNovels = await this.cache.wrap(
      key,
      this.scraper.getNovels.bind(this.scraper)
    );

    if (rawNovels && rawNovels.novels && Array.isArray(rawNovels.novels.blocks)) {
      const mergedSeries = [];
      for (const block of rawNovels.novels.blocks) {
        for (const s of block.series || []) {
          mergedSeries.push({
            id: s.series_id || s.id,
            title: this.processor.sanitizeText(s.title) || null,
            likes: typeof s.likes === 'number' ? s.likes : (parseInt(s.likes, 10) || 0),
            status: s.status || null,
            cover: s.cover || null,
            country: s.country || null,
            language: s.language || null,
            type: s.type || null,
            last_edit: s.last_edit || s.lastEdit || null,
            time: s.time || s.updated || null
          });
        }
      }

      return mergedSeries;
    }

    return [];
  }
}

module.exports = FlameComicsModel;