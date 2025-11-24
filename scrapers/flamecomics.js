const requestManager = require('../utils/requestManager');

const BASE_URL = 'https://flamecomics.xyz';
const CDN_BASE = 'https://cdn.flamecomics.xyz/uploads/images';
const CDN_PATHS = {
  series: `${CDN_BASE}/series`,
  novels: `${CDN_BASE}/novels`
};

class FlameComics {
  constructor() {
    this.baseUrl = BASE_URL;
    this.buildId = null;
    this.lastBuildFetch = 0;
    this.buildCacheDuration = 60 * 60 * 1000; // 1 hour

    this.seriesCache = { data: null, time: 0 };
    this.seriesCacheDuration = 60 * 60 * 1000; // 1 hour
  }

  /** Fetch and cache current Next.js buildId */
  async getBuildId() {
    const now = Date.now();
    if (this.buildId && now - this.lastBuildFetch < this.buildCacheDuration) {
      return this.buildId;
    }

    const html = await requestManager.request(this.baseUrl, 'GET', {}, {}, 'axios');
    const match = html.match(/"buildId":"([^"]+)"/);
    if (!match) throw new Error('Could not extract buildId from homepage.');

    this.buildId = match[1];
    this.lastBuildFetch = now;
    console.log(`[FlameComics] buildId updated: ${this.buildId}`);
    return this.buildId;
  }

  /** Helper to fetch Next.js data route */
  async fetchNextData(route) {
    const buildId = await this.getBuildId();
    const url = `${this.baseUrl}/_next/data/${buildId}${route}.json`;
    const data = await requestManager.request(url, 'GET', {}, {}, 'axios');
    return data?.pageProps || {};
  }

  async getAllSeries() {
    const now = Date.now();
    if (this.seriesCache.data && now - this.seriesCache.time < this.seriesCacheDuration) {
      return this.seriesCache.data;
    }

    const url = `${this.baseUrl}/api/series`;
    const seriesList = await requestManager.request(url, 'GET');
    if (Array.isArray(seriesList)) {
      this.seriesCache = { data: seriesList, time: now };
    }
    return seriesList || [];
  }

  makeImageUrl(id, imageFile, type = 'series') {
    if (!id || !imageFile) return null;

    // Normalize imageFile: it may be a string (filename) or an object like { cover: 'cover.png' }
    let fileName = null;
    if (typeof imageFile === 'string') {
      fileName = imageFile;
    } else if (typeof imageFile === 'object' && imageFile !== null) {
      fileName = imageFile.cover || imageFile.file || imageFile.filename || imageFile.path || null;
    }

    if (!fileName) return null;

    const cdnUrl = CDN_PATHS[type] || CDN_PATHS.series;
    const width = type === 'novels' ? 480 : 1920;
    console.log(`${this.baseUrl}/_next/image?url=${cdnUrl}/${id}/${fileName}&w=${width}&q=75`);
    return `${this.baseUrl}/_next/image?url=${cdnUrl}/${id}/${fileName}&w=${width}&q=75`;
  }

  /** Search manga — manual client-side filter using comprehensive data source */
  async searchManga(query) {
    try {
      if (!query || typeof query !== 'string' || !query.trim()) return [];

      // Get data from latest endpoint which contains comprehensive series info
      const data = await this.fetchNextData('/latest');

      // Extract all series from various possible structures in the response
      const allSeries = [];
      
      // Try different locations where the series data might be
      if (data.allSeries && Array.isArray(data.allSeries)) {
        // If it's in allSeries array
        for (const s of data.allSeries) {
          allSeries.push(s);
        }
      } else if (data.series && Array.isArray(data.series)) {
        // If it's in series array
        for (const s of data.series) {
          allSeries.push(s);
        }
      } else if (data.latestEntries && Array.isArray(data.latestEntries.blocks)) {
        // If it's in the blocks structure
        for (const block of data.latestEntries.blocks) {
          if (Array.isArray(block.series)) {
            for (const s of block.series) {
              allSeries.push(s);
            }
          }
        }
      } else {
        // As a fallback, check if the root level has series array
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value) && value.length > 0 && value[0].title) {
            for (const s of value) {
              allSeries.push(s);
            }
          }
        }
      }

      const q = query.trim().toLowerCase();
      const results = allSeries
        .filter(s => {
          const title = s.title?.toLowerCase() || '';
          return title.includes(q);
        })
        .map(s => ({
          id: String(s.series_id || s.id),
          title: s.title,
          likes: s.likes || 0,
          status: s.status || null,
          cover: s.cover ? this.makeImageUrl(s.series_id || s.id, s.cover, 'series') : null,
          country: s.country || null,
          language: s.language || null,
          type: s.type || null,
          last_edit: s.last_edit || s.lastEdit || null,
          updated: s.updated || s.time || null,
          url: `${this.baseUrl}/series/${s.series_id || s.id}`,
        }));

      // Sort results (exact matches first)
      results.sort((a, b) => {
        const exactA = a.title.toLowerCase() === q;
        const exactB = b.title.toLowerCase() === q;
        if (exactA && !exactB) return -1;
        if (!exactA && exactB) return 1;
        return 0;
      });

      return results;
    } catch (error) {
      console.error('Error searching manga:', error.message);
      return [];
    }
  }

  async getMangaById(id) {
    try {
      const data = await this.fetchNextData(`/series/${id}`);
      const series = data.series || null;

      console.log(data, series);

      if (!series) return null;

      return {
        id: String(series.series_id || id),
        altTitles: series.altTitles,
        title: series.title,
        description: series.description,
        cover: series.cover
          ? this.makeImageUrl(series.series_id, series.cover)
          : null,
        status: series.status || null,
        type: series.type || null,
        country: series.country || null,
        language: series.language || null,
        likes: series.likes || 0,
        tags: series.tags || [],
        author: series.author || [],
        artist: series.artist || [],
        chapters: Array.isArray(data.chapters)
          ? data.chapters.map(ch => {
                const chapterCoverFile = ch.cover && (typeof ch.cover === 'string' ? ch.cover : (ch.cover.cover));
                return {
                  chapter_id: ch.chapter_id,
                  chapter: ch.chapter || '',
                  title: ch.title || '',
                  token: ch.token,
                  releaseDate: ch.release_date || null,
                  cover: chapterCoverFile ? `${this.baseUrl}/uploads/images/series/${id}/${ch.token}/${chapterCoverFile}?${ch.release_date}` : null,
                  url: ch.token ? `${this.baseUrl}/series/${id}/${ch.token}` : null,
                };
              })
          : [],
        url: `${this.baseUrl}/series/${series.series_id || id}`,
      };
    } catch (error) {
      console.error('Error fetching manga by ID:', error.message);
      return null;
    }
  }

  async getMangaChapter(mangaId, token) {
    try {
      const url = `${this.baseUrl}/series/${mangaId}/${token}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      
      const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
      if (scriptMatch) {
        const jsonData = JSON.parse(scriptMatch[1]);
        const pageProps = jsonData?.props?.pageProps;
        const chapter = pageProps?.chapter;
        const chapterList = pageProps?.chapterList || [];
        
        if (chapter) {
          const imageArray = Object.entries(chapter.images || {})
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([_, img]) => `${CDN_BASE}/series/${mangaId}/${token}/${img.name}?${chapter.edit_time}`);

          let prevToken = chapter.previous || null;
          let nextToken = chapter.next || null;

          if ((!prevToken || !nextToken) && Array.isArray(chapterList) && chapter.token) {
            const currentIndex = chapterList.findIndex(ch => String(ch.token) === String(chapter.token));
            if (currentIndex !== -1) {
              if (!prevToken && chapterList[currentIndex + 1]) {
                prevToken = chapterList[currentIndex + 1].token;
              }
              if (!nextToken && chapterList[currentIndex - 1]) {
                nextToken = chapterList[currentIndex - 1].token;
              }
            }
          }

          const prevChapter = prevToken ? chapterList.find(ch => String(ch.token) === String(prevToken)) : null;
          const nextChapter = nextToken ? chapterList.find(ch => String(ch.token) === String(nextToken)) : null;

          const prevUrl = prevToken ? `/series/${prevChapter?.series_id || chapter.series_id || mangaId}/${prevToken}` : null;
          const nextUrl = nextToken ? `/series/${nextChapter?.series_id || chapter.series_id || mangaId}/${nextToken}` : null;

          return {
            series_id: chapter.series_id,
            chapter_id: chapter.chapter_id,
            chapter: chapter.chapter,
            title: chapter.title || '',
            language: chapter.language,
            token: chapter.token,
            release_date: chapter.release_date,
            images: imageArray,
            prev_chapter: prevToken,
            next_chapter: nextToken,
            prevUrl,
            nextUrl,
            altTitles: chapter.altTitles || [],
            tags: chapter.tags || [],
            edit_time: chapter.edit_time
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching manga chapter:', error.message);
      return null;
    }
  }

  async getNovelById(id) {
    try {
      const data = await this.fetchNextData(`/novel/${id}`);
      const novel = data.novel || data.novels || null;
      if (!novel) return null;
      return {
        id: String(novel.novel_id || id),
        altTitles: novel.altTitles,
        title: novel.title,
        description: novel.description,
        cover: novel.cover ? this.makeImageUrl(novel.novel_id || id, novel.cover, 'novels') : null,
        status: novel.status || null,
        type: novel.type || null,
        country: novel.country || null,
        language: novel.language || null,
        tags: novel.tags || [],
        author: novel.author || [],
        publisher: novel.publisher || [],
        year: novel.year || null,
        chapters: Array.isArray(data.chapters)
          ? data.chapters.map(ch => ({
              chapter_id: ch.chapter_id,
              chapter: ch.chapter || '',
              title: ch.title || '',
              token: ch.token,
              releaseDate: ch.release_date || null,
              url: ch.token ? `${this.baseUrl}/novel/${id}/${ch.token}` : null,
            }))
          : [],
        url: `${this.baseUrl}/novel/${novel.novel_id || id}`,
      };
    } catch (error) {
      console.error('Error fetching novel by ID:', error.message);
      return null;
    }
  }

  async getPopularManga() {
    try {
      const data = await this.fetchNextData('/index');
      const blocks = data.popularEntries?.blocks || [];
      const normalizedBlocks = (blocks || []).map(block => {
        return {
          title: block.title,
          series: (block.series || []).map(s => ({
            series_id: s.series_id || s.id,
            title: s.title,
            language: s.language,
            type: s.type,
            tags: Array.isArray(s.tags) ? s.tags : (s.genres || []),
            country: s.country,
            author: Array.isArray(s.author) ? s.author : (s.authors ? s.authors : []),
            artist: Array.isArray(s.artist) ? s.artist : (s.artists ? s.artists : []),
            publisher: Array.isArray(s.publisher) ? s.publisher : (s.publishers ? s.publishers : []),
            status: s.status,
            cover: this.makeImageUrl(s.series_id || s.id, s.cover, 'series')
          }))
        };
      });
      return { popularEntries: { blocks: normalizedBlocks } };
    } catch (error) {
      console.error('Error fetching popular manga:', error.message);
      return { popularEntries: { blocks: [] } };
    }
  }

  async getNewManga() {
    try {
      const data = await this.fetchNextData('/index');
      const latestBlocks = data.latestEntries?.blocks || [];
      const list = [];

      for (const block of latestBlocks) {
        for (const series of block.series || []) {
          list.push({
            id: String(series.series_id),
            title: series.title,
            cover: this.makeImageUrl(series.series_id, series.cover, 'series'),
            status: series.status,
            type: series.type,
            url: `${this.baseUrl}/series/${series.series_id}`,
          });
        }
      }

      return list;
    } catch (error) {
      console.error('Error fetching new manga:', error.message);
      return [];
    }
  }

  async getLatest() {
    try {
      const data = await this.fetchNextData('/index');
      const latestBlocks = data.latestEntries?.blocks || [];

      const normalizedBlocks = (latestBlocks || []).map(block => {
        return {
          title: block.title,
          showChapters: typeof block.showChapters === 'boolean' ? block.showChapters : false,
          carousel: typeof block.carousel === 'boolean' ? block.carousel : false,
          series: (block.series || []).map(s => ({
            series_id: s.series_id || s.id,
            title: s.title,
            likes: typeof s.likes === 'number' ? s.likes : (parseInt(s.likes, 10) || 0),
            status: s.status,
            cover: this.makeImageUrl(s.series_id || s.id, s.cover || 'thumbnail.png', 'series'),
            country: s.country || null,
            language: s.language || null,
            type: s.type || null,
            last_edit: s.last_edit || s.lastEdit || null,
            time: s.time || s.updated || null,
            chapters: Array.isArray(s.chapters)
              ? s.chapters.map(ch => ({
                  series_id: s.series_id || s.id,
                  chapter: ch.chapter || null,
                  title: ch.title || '',
                  language: ch.language || s.language || null,
                  release_date: ch.release_date || null,
                  token: ch.token || ''
                }))
              : []
          }))
        };
      });

      return { latestEntries: { blocks: normalizedBlocks } };
    } catch (error) {
      console.error('Error fetching latest chapters:', error.message);
      return { latestEntries: { blocks: [] } };
    }
  }

  /** Advanced search with comprehensive filtering capabilities */
  async advancedSearch(query, filters = {}) {
    try {
      const data = await this.fetchNextData('/latest');

      const allSeries = [];

      if (data.allSeries && Array.isArray(data.allSeries)) {
        for (const s of data.allSeries) {
          allSeries.push(s);
        }
      } else if (data.series && Array.isArray(data.series)) {
        for (const s of data.series) {
          allSeries.push(s);
        }
      } else if (data.latestEntries && Array.isArray(data.latestEntries.blocks)) {
        for (const block of data.latestEntries.blocks) {
          if (Array.isArray(block.series)) {
            for (const s of block.series) {
              allSeries.push(s);
            }
          }
        }
      } else {
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value) && value.length > 0 && value[0].title) {
            for (const s of value) {
              allSeries.push(s);
            }
          }
        }
      }

      const q = query.trim().toLowerCase();
      let filteredSeries = allSeries
        .filter(s => {
          const title = s.title?.toLowerCase() || '';
          return title.includes(q);
        })
        .map(s => ({
          id: String(s.series_id || s.id),
          title: s.title,
          likes: s.likes || 0,
          status: s.status || null,
          cover: s.cover ? this.makeImageUrl(s.series_id || s.id, s.cover, 'series') : null,
          country: s.country || null,
          language: s.language || null,
          type: s.type || null,
          last_edit: s.last_edit || s.lastEdit || null,
          updated: s.updated || s.time || null,
          url: `${this.baseUrl}/series/${s.series_id || s.id}`,
        }));

      // Apply additional filters
      filteredSeries = this.applyFiltersToAllSeries(filteredSeries, filters);

      return { results: filteredSeries, pagination: null };
    } catch (error) {
      console.error('Error in advanced search:', error.message);
      return { results: [], pagination: null };
    }
  }

  /** Helper function to apply filters to all series data */
  applyFiltersToAllSeries(series, filters) {
    if (!filters || typeof filters !== 'object') return series;

    // Filter by status (e.g., ongoing, completed)
    if (filters.status) {
      series = series.filter(s => 
        s.status && s.status.toLowerCase().includes(filters.status.toLowerCase())
      );
    }

    // Filter by type (manga, manhua, manhwa, etc.)
    if (filters.type) {
      series = series.filter(s => 
        s.type && s.type.toLowerCase().includes(filters.type.toLowerCase())
      );
    }

    // Filter by country
    if (filters.country) {
      series = series.filter(s => 
        s.country && s.country.toLowerCase().includes(filters.country.toLowerCase())
      );
    }

    // Filter by language
    if (filters.language) {
      series = series.filter(s => 
        s.language && s.language.toLowerCase().includes(filters.language.toLowerCase())
      );
    }

    // Filter by tags/genres
    if (Array.isArray(filters.tags) && filters.tags.length > 0) {
      series = series.filter(s => {
        if (!s.tags || !Array.isArray(s.tags)) return false;
        return filters.tags.some(filterTag => 
          s.tags.some(tag => 
            tag.toLowerCase().includes(filterTag.toLowerCase())
          )
        );
      });
    }

    // Filter by minimum chapter count
    if (filters.minChapters) {
      series = series.filter(s => 
        s.chapters && s.chapters.length >= filters.minChapters
      );
    }

    // Filter by maximum chapter count
    if (filters.maxChapters) {
      series = series.filter(s => 
        s.chapters && s.chapters.length <= filters.maxChapters
      );
    }

    return series;
  }

  async getStaffPicks() {
    try {
      const data = await this.fetchNextData('/index');
      const staffPicksBlocks = data.staffPicks?.blocks || [];

      const normalizedBlocks = (staffPicksBlocks || []).map(block => {
        return {
          title: block.title,
          showChapters: typeof block.showChapters === 'boolean' ? block.showChapters : false,
          carousel: typeof block.carousel === 'boolean' ? block.carousel : false,
          series: (block.series || []).map(s => ({
            series_id: s.series_id || s.id,
            title: s.title,
            language: s.language,
            type: s.type,
            tags: Array.isArray(s.tags) ? s.tags : (s.genres || []),
            country: s.country,
            author: Array.isArray(s.author) ? s.author : (s.authors ? s.authors : []),
            status: s.status,
            likes: typeof s.likes === 'number' ? s.likes : (parseInt(s.likes, 10) || 0),
            cover: this.makeImageUrl(s.series_id || s.id, s.cover, 'series')
          }))
        };
      });

      return { staffPicks: { blocks: normalizedBlocks } };
    } catch (error) {
      console.error('Error fetching staff picks:', error.message);
      return { staffPicks: { blocks: [] } };
    }
  }

  async getNovels() {
    try {
      const data = await this.fetchNextData('/index');
      const novelsBlocks = data.novels?.blocks || [];

      // Normalize novels blocks. Some entries use `novel_id` (instead of `series_id`)
      // so prefer novel_id then fallback to series_id or id. Build cover using that id.
      const normalizedBlocks = (novelsBlocks || []).map(block => {
        return {
          title: block.title,
          showChapters: typeof block.showChapters === 'boolean' ? block.showChapters : false,
          carousel: typeof block.carousel === 'boolean' ? block.carousel : false,
          series: (block.series || []).map(s => {
            const id = s.novel_id || s.series_id || s.id;
            return {
              series_id: id,
              title: s.title,
              language: s.language,
              type: s.type,
              tags: Array.isArray(s.tags) ? s.tags : (s.genres || []),
              country: s.country,
              author: Array.isArray(s.author) ? s.author : (s.authors ? s.authors : []),
              status: s.status,
              likes: typeof s.likes === 'number' ? s.likes : (parseInt(s.likes, 10) || 0),
              cover: this.makeImageUrl(id, s.cover, 'novels'),
              last_edit: s.last_edit || s.lastEdit,
              time: s.time || s.updated
            };
          })
        };
      });

      return { novels: { blocks: normalizedBlocks } };
    } catch (error) {
      console.error('Error fetching novels:', error.message);
      return { novels: { blocks: [] } };
    }
  }
}

module.exports = FlameComics;