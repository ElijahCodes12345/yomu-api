const Mangapark = require('../scrapers/mangapark');
const BaseDataProcessor = require('../utils/dataProcessor');
const Cache = require('../utils/cache');

class MangaparkModel {
  constructor() {
    this.scraper = new Mangapark();
    this.processor = BaseDataProcessor;
    this.cache = new Cache(5 * 60 * 1000); // 5 minutes
  }

  searchManga = async (query, page = 1, size = 10) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    const key = `mangapark_search_${query.trim().toLowerCase()}_${page}_${size}`;
    const rawResults = await this.cache.wrap(
      key,
      this.scraper.searchManga.bind(this.scraper),
      query.trim(),
      page,
      size
    );

    if (rawResults && rawResults.results) {
      return {
        results: this.processSearchResults(rawResults.results),
        pagination: rawResults.pagination || null
      };
    }

    return { results: [], pagination: null };
  }

  getMangaById = async (id) => {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }

    const validatedId = this.processor.validateId(id);
    const key = `mangapark_manga_${validatedId}`;
    const rawManga = await this.cache.wrap(
      key,
      this.scraper.getMangaById.bind(this.scraper),
      validatedId
    );

    return this.processMangaDetails(rawManga);
  }

  getMangaChapter = async (mangaId, token) => {
    if (!mangaId || !token || typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('Both mangaId and token are required');
    }

    const key = `mangapark_chapter_${mangaId}_${token}`;
    const rawChapter = await this.cache.wrap(
      key,
      () => this.scraper.getMangaChapter(mangaId, token)
    );

    if (!rawChapter) return null;

    return this.processChapterContent({
      ...rawChapter,
      mangaId: mangaId || rawChapter.mangaId
    });
  }

  getPopularManga = async (page = 1, size = 24) => {
    const key = `mangapark_popular_${page}_${size}`;
    const rawPopular = await this.cache.wrap(
      key,
      this.scraper.getPopularManga.bind(this.scraper),
      page,
      size
    );

    if (rawPopular && rawPopular.popularEntries && Array.isArray(rawPopular.popularEntries.blocks)) {
      const mergedSeries = [];
      for (const block of rawPopular.popularEntries.blocks) {
        for (const s of block.series || []) {
          mergedSeries.push({
            id: s.series_id || s.id,
            title: this.processor.sanitizeText(s.title) || null,
            url: s.url || null,
            urlPath: s.urlPath || null,
            cover: s.cover || null,
            coverOriginal: s.coverOriginal || null,
            follows: typeof s.follows === 'number' ? s.follows : (parseInt(s.follows, 10) || 0),
            status: s.status || null,
            country: s.country || null,
            language: s.language || null,
            type: s.type || null,
            is_hot: s.is_hot || false,
            is_new: s.is_new || false,
            sfw_result: s.sfw_result || false,
            last_edit: s.last_edit || s.lastEdit || null,
            time: s.time || s.updated || null,
            latest_chapter: s.latest_chapter || null
          });
        }
      }

      return {
        results: mergedSeries,
        pagination: rawPopular.pagination
      };
    }

    return { results: [], pagination: null };
  }

  advancedSearch = async (query, filters = {}) => {

    const {
      page = 1,
      size = 10,
      sortby = 'field_score',
      genres_include = [],
      genres_exclude = [],
      orig = '',
      lang = '',
      status = '',
      upload = ''
    } = filters;

    // Handle genres_include and genres_exclude that might come as strings
    let parsed_genres_include = [];
    if (typeof genres_include === 'string') {
      parsed_genres_include = genres_include.split(',').map(genre => genre.trim());
    } else if (Array.isArray(genres_include)) {
      parsed_genres_include = genres_include.map(genre => genre.trim());
    }

    let parsed_genres_exclude = [];
    if (typeof genres_exclude === 'string') {
      parsed_genres_exclude = genres_exclude.split(',').map(genre => genre.trim());
    } else if (Array.isArray(genres_exclude)) {
      parsed_genres_exclude = genres_exclude.map(genre => genre.trim());
    }

    const extendedFilters = {
      page: parseInt(page) || 1,
      size: parseInt(size) || 10,
      sortby,
      genres_include: parsed_genres_include,
      genres_exclude: parsed_genres_exclude,
      orig,
      lang,
      status,
      upload
    };

    const key = `mangapark_advanced_search_${query.trim().toLowerCase()}_${JSON.stringify(extendedFilters)}`;
    const result = await this.cache.wrap(
      key,
      this.scraper.advancedSearch.bind(this.scraper),
      query.trim(),
      extendedFilters
    );

    if (result && result.results) {
      return {
        results: this.processSearchResults(result.results),
        pagination: result.pagination || null
      };
    }

    return { results: [], pagination: null };
  }

  getNewManga = async (page = 1, size = 36) => {
    const key = `mangapark_new_manga_${page}_${size}`;
    const rawNewManga = await this.cache.wrap(
      key,
      this.scraper.getNewManga.bind(this.scraper),
      page,
      size
    );

    if (rawNewManga && rawNewManga.results) {
      return {
        results: this.processMangaList(rawNewManga.results),
        pagination: rawNewManga.pagination || null
      };
    }

    return { results: [], pagination: null };
  }

  getLatest = async (page = 1, size = 36) => {
    const key = `mangapark_latest_${page}_${size}`;
    const rawLatest = await this.cache.wrap(
      key,
      this.scraper.getLatest.bind(this.scraper),
      page,
      size
    );

    if (rawLatest && rawLatest.latestEntries && Array.isArray(rawLatest.latestEntries.blocks)) {
      const mergedSeries = [];
      for (const block of rawLatest.latestEntries.blocks) {
        for (const s of block.series || []) {
          mergedSeries.push({
            id: s.series_id || s.id,
            title: this.processor.sanitizeText(s.title) || null,
            url: s.url || null,
            urlPath: s.urlPath || null,
            cover: s.cover || null,
            coverOriginal: s.coverOriginal || null,
            follows: typeof s.follows === 'number' ? s.follows : (parseInt(s.follows, 10) || 0),
            status: s.status || null,
            country: s.country || null,
            language: s.language || null,
            type: s.type || null,
            is_hot: s.is_hot || false,
            is_new: s.is_new || false,
            sfw_result: s.sfw_result || false,
            last_edit: s.last_edit || s.lastEdit || null,
            time: s.time || s.updated || null,
            chapters: Array.isArray(s.chapters)
              ? s.chapters.map(ch => ({
                  id: s.series_id || s.id,
                  chapter: ch.chapter || null,
                  title: this.processor.sanitizeText(ch.title) || null,
                  url: ch.url || null,
                  urlPath: ch.urlPath || null,
                  language: ch.language || null,
                  release_date: ch.release_date || null,
                  token: ch.token || null,
                  is_new: ch.is_new || false,
                  is_final: ch.is_final || false
                }))
              : []
          });
        }
      }

      return {
        results: mergedSeries,
        pagination: rawLatest.pagination
      };
    }

    return { results: [], pagination: null };
  }

  getLatestAnime = async () => {
    const key = 'mangapark_latest_anime';
    const rawLatestAnime = await this.cache.wrap(
      key,
      this.scraper.getLatestAnime.bind(this.scraper)
    );

    return this.processLatestAnime(rawLatestAnime);
  }

  processMangaList(mangaList) {
    if (!Array.isArray(mangaList)) return [];
    return mangaList.map(manga => ({
      id: this.processor.validateId(manga.id),
      title: this.processor.sanitizeText(manga.title),
      url: manga.url || null,
      urlPath: manga.urlPath || null,
      cover: manga.cover || null,
      coverOriginal: manga.coverOriginal || null,
      language: manga.language || null,
      type: this.processor.sanitizeText(manga.type) || null,
      country: manga.country || null,
      status: this.processor.sanitizeText(manga.status) || null,
      follows: manga.follows || 0,
      mParkStatus: manga.mParkStatus || null,
      is_hot: manga.is_hot || false,
      is_new: manga.is_new || false,
      isCompleted: manga.isCompleted || false,
      sfw_result: manga.sfw_result || false,
      last_edit: manga.last_edit || null,
      updated: manga.updated || null,
      latest_chapter: manga.latest_chapter || null
    }));
  }

  processSearchResults(data) {
    if (!data || !Array.isArray(data)) return [];
    return data.map(result => ({
      id: result.id || null,
      title: this.processor.sanitizeText(result.title),
      url: result.url || null,
      urlPath: result.urlPath || null,
      cover: result.cover || null,
      coverOriginal: result.coverOriginal || null,
      language: result.language || null,
      type: this.processor.sanitizeText(result.type) || null,
      country: result.country || null,
      follows: result.follows || 0,
      mParkStatus: result.mParkStatus || null,
      score: result.score || 0,
      reviews: result.reviews || 0,
      comments: result.comments || 0,
      genres: result.genres || [],
      altNames: result.altNames || [],
      authors: result.authors || [],
      is_hot: result.is_hot || false,
      is_new: result.is_new || false,
      isCompleted: result.isCompleted || false,
      sfw_result: result.sfw_result || false,
      last_edit: result.last_edit || null,
      updated: result.updated || null,
      latest_chapter: result.latest_chapter || null
    }));
  }

  processMangaDetails(manga) {
    if (!manga) return null;
    return {
      id: manga.id || null,
      title: this.processor.sanitizeText(manga.title),
      url: manga.url || null,
      urlPath: manga.urlPath || null,
      altTitles: Array.isArray(manga.altTitles) ? manga.altTitles : [],
      description: this.processor.sanitizeText(manga.description) || null,
      cover: manga.cover || null,
      coverOriginal: manga.coverOriginal || null,
      language: manga.language || null,
      type: this.processor.sanitizeText(manga.type) || null,
      tags: Array.isArray(manga.tags) ? manga.tags.map(tag => this.processor.sanitizeText(tag)) : [],
      country: manga.country || null,
      author: Array.isArray(manga.author) ? manga.author : [],
      status: this.processor.sanitizeText(manga.status) || null,
      mParkStatus: this.processor.sanitizeText(manga.mParkStatus) || null,
      isCompleted: manga.isCompleted || false,
      score: manga.score || 0,
      follows: manga.follows || 0,
      reviews: manga.reviews || 0,
      comments: manga.comments || 0,
      sfw_result: manga.sfw_result || false,
      externalLinks: Array.isArray(manga.externalLinks) ? manga.externalLinks : [],
      chapters: Array.isArray(manga.chapters) ? manga.chapters.map(chapter => ({
        chapter_id: chapter.chapter_id,
        chapter: chapter.chapter || null,
        title: this.processor.sanitizeText(chapter.title) || null,
        url: chapter.url || null,
        urlPath: chapter.urlPath || null,
        release_date: chapter.release_date,
        token: chapter.token,
        is_final: chapter.is_final || false, // Indicates if this is the final chapter
        uploader: chapter.uploader ? {
          name: this.processor.sanitizeText(chapter.uploader.name) || null,
          url: chapter.uploader.url || null,
          avatar: chapter.uploader.avatar || null,
          is_bot: chapter.uploader.is_bot || false
        } : null,
        comments: chapter.comments || 0,
        views: chapter.views || 0,
        additionalViews: chapter.additionalViews || 0
      })) : []
    };
  }

  processChapterContent(chapter) {
    if (!chapter) return null;
    return {
      id: this.processor.validateId(chapter.id) || null,
      chapterId: this.processor.validateId(chapter.chapterId) || null,
      title: this.processor.sanitizeText(chapter.title) || null,
      pages: Array.isArray(chapter.pages)
        ? this.scraper.fixImageUrls(chapter.pages.filter(page => page && typeof page === 'string').map(page => page.trim()))
        : [],
      url: chapter.url || null,
      prevUrl: chapter.prevUrl || null,
      nextUrl: chapter.nextUrl || null,
    };
  }

  processLatestAnime(animeList) {
    if (!Array.isArray(animeList)) return [];
    return animeList.map(anime => ({
      id: this.processor.validateId(anime.id),
      title: this.processor.sanitizeText(anime.title),
      url: anime.url || null,
      cover: anime.cover || null,
      coverAlt: this.processor.sanitizeText(anime.coverAlt) || null,
      genres: Array.isArray(anime.genres)
        ? anime.genres.map(g => this.processor.sanitizeText(g))
        : [],
      latest_episode: anime.latest_episode ? {
        title: this.processor.sanitizeText(anime.latest_episode.title),
        url: anime.latest_episode.url || null,
        id: anime.latest_episode.id || null
      } : null,
      updated: anime.updated || null
    }));
  }
}

module.exports = MangaparkModel;