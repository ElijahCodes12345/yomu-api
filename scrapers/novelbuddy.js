const requestManager = require('../utils/requestManager');
const cheerio = require('cheerio');

const BASE_URL = 'https://novelbuddy.me';

class NovelBuddy {
  constructor() {
    this.baseUrl = BASE_URL;
    this.buildId = null;
  }

  /**
   * Helper to ensure URLs are absolute
   */
  formatUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /**
   * Extract Next.js buildId dynamically
   */
  async getBuildId() {
    if (this.buildId) return this.buildId;
    try {
      const html = await requestManager.request(this.baseUrl, 'GET', {}, {}, 'axios');
      const match = html.match(/"buildId":"([^"]+)"/) || html.match(/\/_next\/static\/([^"\/]+)\/_buildManifest\.js/);
      if (match) {
        this.buildId = match[1];
        return this.buildId;
      }
    } catch (e) {
      console.error('Error fetching NovelBuddy buildId:', e.message);
    }
    return '9P0SYeE3d2XUw1wq7ihOs'; // Fallback cached buildId
  }

  /**
   * Helper to extract __NEXT_DATA__ from HTML
   */
  extractNextData(html) {
    try {
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        const json = JSON.parse(match[1]);
        return json.props?.pageProps || json.pageProps || json;
      }
    } catch (e) {
      console.error('Error parsing __NEXT_DATA__:', e.message);
    }
    return null;
  }

  /**
   * Search novels by query string
   */
  async searchNovels(query, page = 1) {
    try {
      const buildId = await this.getBuildId();
      const nextDataUrl = `${this.baseUrl}/_next/data/${buildId}/search.json?q=${encodeURIComponent(query)}&page=${page}`;
      
      let items = [];
      try {
        const jsonRes = await requestManager.request(nextDataUrl, 'GET', {}, {}, 'axios');
        items = jsonRes.pageProps?.ssrItems || jsonRes.pageProps?.items || [];
      } catch (e) {
        // Fallback to HTML request
        const html = await requestManager.request(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`, 'GET', {}, {}, 'axios');
        const nextData = this.extractNextData(html);
        items = nextData?.pageProps?.ssrItems || nextData?.pageProps?.items || [];
      }

      return items.map((item) => {
        const slug = item.slug || (item.url ? item.url.replace(/^\//, '') : item.id);
        const genres = Array.isArray(item.genres) 
          ? item.genres.map(g => typeof g === 'object' ? g.name : g)
          : [];

        return {
          id: slug,
          title: item.name || item.title,
          altTitle: item.altName || null,
          cover: this.formatUrl(item.cover),
          status: item.status || null,
          rating: item.rating || parseFloat(item.displayRating) || 0,
          genres,
          latestChapter: item.latestChapters?.[0]?.name || null,
          totalChapters: item.stats?.chaptersCount || (item.displayChapters ? parseInt(item.displayChapters, 10) : 0),
          views: item.stats?.views || item.displayViews || null,
          url: `${this.baseUrl}/${slug}`
        };
      });
    } catch (error) {
      console.error('Error searching novels on NovelBuddy:', error.message);
      throw new Error(`Failed to search novels on NovelBuddy: ${error.message}`);
    }
  }

  /**
   * Get detailed novel information
   */
  async getNovelInfo(id) {
    try {
      const slug = id.replace(/^\//, '').replace(/^novel\//, '');
      const url = `${this.baseUrl}/${slug}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const nextData = this.extractNextData(html);

      const m = nextData?.initialManga || nextData?.pageProps?.initialManga || {};
      const $ = cheerio.load(html);

      const title = m.name || $('h1, .novel-title').text().trim() || slug;
      const cover = this.formatUrl(m.cover || $('.cover img, .book-img img').attr('src'));
      const status = m.status || 'Ongoing';
      const rating = m.rating || 0;
      const description = m.summary 
        ? cheerio.load(m.summary).text().trim() 
        : $('.summary, .description, #tab-description').text().trim();
      
      const genres = Array.isArray(m.genres) 
        ? m.genres.map(g => typeof g === 'object' ? g.name : g)
        : $('.genres a, a[href*="/genres/"]').map((i, el) => $(el).text().trim()).get();

      const authors = Array.isArray(m.authors)
        ? m.authors.map(a => typeof a === 'object' ? a.name : a)
        : $('.author a, a[href*="/authors/"]').map((i, el) => $(el).text().trim()).get();

      const latestChapters = Array.isArray(m.latestChapters)
        ? m.latestChapters.map(c => ({
            chapterId: c.slug || c.url?.replace(/^\/[^\/]+\//, '') || c.id,
            title: c.name,
            date: c.date || null,
            url: this.formatUrl(c.url)
          }))
        : [];

      return {
        id: slug,
        title,
        altTitle: m.altName || null,
        author: authors.join(', ') || null,
        cover,
        status,
        rating,
        genres,
        totalChapters: m.stats?.chaptersCount || latestChapters.length || 0,
        description,
        latestChapters,
        url: `${this.baseUrl}/${slug}`
      };
    } catch (error) {
      console.error(`Error getting novel info for ${id} on NovelBuddy:`, error.message);
      throw new Error(`Failed to get novel info from NovelBuddy: ${error.message}`);
    }
  }

  /**
   * Get chapters for a novel (fetches complete chapter list)
   */
  async getChapters(id) {
    try {
      const slug = id.replace(/^\//, '').replace(/^novel\//, '');
      const html = await requestManager.request(`${this.baseUrl}/${slug}`, 'GET', {}, {}, 'axios');
      const nextData = this.extractNextData(html);
      const m = nextData?.initialManga || nextData?.pageProps?.initialManga || {};
      const mangaId = m.id || nextData?.mangaHsid || nextData?.pageProps?.mangaHsid;

      // 1. Fetch complete chapter list from NovelBuddy titles API
      if (mangaId) {
        try {
          const apiUrl = `https://api.novelbuddy.me/titles/${mangaId}/chapters`;
          const headers = {
            'Referer': 'https://novelbuddy.me/',
            'Origin': 'https://novelbuddy.me'
          };
          const apiRes = await requestManager.request(apiUrl, 'GET', headers, {}, 'axios');
          const rawChapters = apiRes?.data?.chapters || (Array.isArray(apiRes?.data) ? apiRes.data : []);

          if (Array.isArray(rawChapters) && rawChapters.length > 0) {
            const chapters = rawChapters.map((c) => ({
              chapterId: c.slug || c.url?.replace(/^\/[^\/]+\//, '') || c.id,
              chapterNumber: c.number || null,
              title: c.name,
              views: c.views || 0,
              commentsCount: c.comments_count || 0,
              date: c.updated_at || null,
              url: this.formatUrl(c.url)
            }));

            return {
              novelId: slug,
              totalChapters: m.stats?.chaptersCount || chapters.length,
              chapters
            };
          }
        } catch (apiErr) {
          console.warn(`NovelBuddy titles API chapter fetch fallback: ${apiErr.message}`);
        }
      }

      // 2. Fallback to structured chapters array in __NEXT_DATA__
      if (Array.isArray(m.chapters) && m.chapters.length > 0) {
        const chapters = m.chapters.map((c) => ({
          chapterId: c.slug || c.url?.replace(/^\/[^\/]+\//, '') || c.id,
          chapterNumber: c.number || null,
          title: c.name,
          date: c.updatedAt || null,
          url: this.formatUrl(c.url)
        }));

        return {
          novelId: slug,
          totalChapters: m.stats?.chaptersCount || chapters.length,
          chapters
        };
      }

      // 3. Fallback to DOM parsing
      const $ = cheerio.load(html);
      const chapters = [];
      $('a[href*="/chapter-"], .chapter-list a, ul.list-chapter a').each((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).attr('title');
        const chapSlugMatch = href ? href.match(/\/([^\/]+)$/) : null;
        const chapterId = chapSlugMatch ? chapSlugMatch[1] : `chapter-${i + 1}`;
        const chNumMatch = title ? title.match(/Chapter\s+(\d+(?:\.\d+)?)/i) : null;

        if (href && !chapters.some(c => c.chapterId === chapterId)) {
          chapters.push({
            chapterId,
            chapterNumber: chNumMatch ? parseFloat(chNumMatch[1]) : (i + 1),
            title,
            url: this.formatUrl(href)
          });
        }
      });

      return {
        novelId: slug,
        totalChapters: chapters.length,
        chapters
      };
    } catch (error) {
      console.error(`Error getting chapters for ${id} on NovelBuddy:`, error.message);
      throw new Error(`Failed to get chapters from NovelBuddy: ${error.message}`);
    }
  }

  /**
   * Read chapter text content
   */
  async getChapterContent(novelSlug, chapterSlug) {
    try {
      let nSlug = novelSlug;
      let cSlug = chapterSlug;

      if (!cSlug && nSlug && nSlug.includes('/')) {
        const parts = nSlug.split('/');
        nSlug = parts[0];
        cSlug = parts[1];
      }

      const url = `${this.baseUrl}/${nSlug}/${cSlug}`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'axios');
      const nextData = this.extractNextData(html);

      const initialCh = nextData?.initialChapter || nextData?.pageProps?.initialChapter;
      const $ = cheerio.load(html);

      let title = initialCh?.name || $('h1, h2, .chapter-title').text().trim() || `${nSlug} ${cSlug}`;
      let contentHtml = initialCh?.content || $('#chapter-content, .chapter-content, .reading-content, .content-inner').html() || '';
      
      const $content = cheerio.load(contentHtml);
      // Remove ads and unwanted widgets
      $content('script, style, iframe, div[style*="text-align:center"]').remove();

      const paragraphs = [];
      $content('p').each((i, el) => {
        const text = $content(el).text().trim();
        if (text) paragraphs.push(text);
      });

      if (paragraphs.length === 0 && contentHtml) {
        const rawText = $content.text().trim();
        if (rawText) {
          rawText.split('\n').map(p => p.trim()).filter(Boolean).forEach(p => paragraphs.push(p));
        }
      }

      const nextChapterSlug = nextData?.nextChapter?.slug || nextData?.pageProps?.nextChapter?.slug || null;
      const prevChapterSlug = nextData?.previousChapter?.slug || nextData?.pageProps?.previousChapter?.slug || null;

      return {
        novelId: nSlug,
        chapterId: cSlug,
        title,
        wordCount: initialCh?.word_count || paragraphs.join(' ').split(/\s+/).length,
        readingTimeMinutes: initialCh?.reading_time_minutes || Math.ceil(paragraphs.join(' ').split(/\s+/).length / 200),
        paragraphs,
        html: $content.html() || contentHtml,
        prevChapterId: prevChapterSlug,
        nextChapterId: nextChapterSlug
      };
    } catch (error) {
      console.error(`Error reading chapter ${chapterSlug} of ${novelSlug} on NovelBuddy:`, error.message);
      throw new Error(`Failed to read chapter from NovelBuddy: ${error.message}`);
    }
  }

  /**
   * Helper to fetch list pages (latest, popular, ranking)
   */
  async getFeed(type = 'latest', page = 1) {
    try {
      const buildId = await this.getBuildId();
      const nextDataUrl = `${this.baseUrl}/_next/data/${buildId}/${type}.json?page=${page}`;

      let items = [];
      try {
        const jsonRes = await requestManager.request(nextDataUrl, 'GET', {}, {}, 'axios');
        items = jsonRes.pageProps?.items || jsonRes.pageProps?.ssrItems || [];
      } catch (e) {
        const html = await requestManager.request(`${this.baseUrl}/${type}?page=${page}`, 'GET', {}, {}, 'axios');
        const nextData = this.extractNextData(html);
        items = nextData?.pageProps?.items || nextData?.pageProps?.ssrItems || [];
      }

      return items.map((item) => {
        const slug = item.slug || (item.url ? item.url.replace(/^\//, '') : item.id);
        const genres = Array.isArray(item.genres) 
          ? item.genres.map(g => typeof g === 'object' ? g.name : g)
          : [];

        return {
          id: slug,
          title: item.name || item.title,
          cover: this.formatUrl(item.cover),
          status: item.status || null,
          rating: item.rating || parseFloat(item.displayRating) || 0,
          genres,
          latestChapter: item.latestChapters?.[0]?.name || null,
          totalChapters: item.stats?.chaptersCount || (item.displayChapters ? parseInt(item.displayChapters, 10) : 0),
          url: `${this.baseUrl}/${slug}`
        };
      });
    } catch (error) {
      console.error(`Error getting ${type} feed on NovelBuddy:`, error.message);
      throw new Error(`Failed to get ${type} feed from NovelBuddy: ${error.message}`);
    }
  }

  /**
   * Get latest updated novels
   */
  async getLatest(page = 1) {
    return this.getFeed('latest', page);
  }

  /**
   * Get popular novels
   */
  async getPopular(page = 1) {
    return this.getFeed('popular', page);
  }

  /**
   * Get ranking novels
   */
  async getRanking(page = 1) {
    return this.getFeed('ranking', page);
  }

  /**
   * Get all genres
   */
  async getGenres() {
    try {
      const html = await requestManager.request(`${this.baseUrl}/genres`, 'GET', {}, {}, 'axios');
      const $ = cheerio.load(html);

      const genres = [];
      $('a[href*="/genres/"]').each((i, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr('href');
        const slugMatch = href ? href.match(/\/genres\/([^\/]+)/) : null;
        const slug = slugMatch ? slugMatch[1] : name.toLowerCase().replace(/\s+/g, '-');
        if (name && !genres.some(g => g.slug === slug)) {
          genres.push({
            name,
            slug,
            url: this.formatUrl(href)
          });
        }
      });

      return genres;
    } catch (error) {
      console.error('Error getting genres on NovelBuddy:', error.message);
      throw new Error(`Failed to get genres from NovelBuddy: ${error.message}`);
    }
  }

  /**
   * Get novels by genre
   */
  async getNovelsByGenre(genre, page = 1) {
    try {
      const gSlug = genre.toLowerCase().replace(/\s+/g, '-');
      const html = await requestManager.request(`${this.baseUrl}/genres/${gSlug}?page=${page}`, 'GET', {}, {}, 'axios');
      const nextData = this.extractNextData(html);

      const items = nextData?.items || nextData?.pageProps?.items || nextData?.pageProps?.ssrItems || [];
      if (items.length > 0) {
        return items.map((item) => {
          const slug = item.slug || (item.url ? item.url.replace(/^\//, '') : item.id);
          return {
            id: slug,
            title: item.name || item.title,
            cover: this.formatUrl(item.cover),
            status: item.status || null,
            rating: item.rating || parseFloat(item.displayRating) || 0,
            genres: Array.isArray(item.genres) ? item.genres.map(g => typeof g === 'object' ? g.name : g) : [],
            url: `${this.baseUrl}/${slug}`
          };
        });
      }

      // Fallback DOM parsing
      const $ = cheerio.load(html);
      const results = [];
      $('.book-item, .novel-item, .row-novel').each((i, el) => {
        const title = $(el).find('h3, .title, .novel-title').text().trim();
        const href = $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
        const slug = href ? href.replace(/^\//, '') : null;
        if (slug) {
          results.push({
            id: slug,
            title,
            cover: this.formatUrl(cover),
            url: this.formatUrl(href)
          });
        }
      });

      return results;
    } catch (error) {
      console.error(`Error getting novels for genre ${genre} on NovelBuddy:`, error.message);
      throw new Error(`Failed to get novels for genre from NovelBuddy: ${error.message}`);
    }
  }

  /**
   * Get homepage featured & latest
   */
  async getHomePage() {
    try {
      const [popular, latest] = await Promise.all([
        this.getPopular(1),
        this.getLatest(1)
      ]);

      return {
        featured: popular.slice(0, 6),
        popular: popular.slice(0, 10),
        latestUpdates: latest
      };
    } catch (error) {
      console.error('Error getting home page on NovelBuddy:', error.message);
      throw new Error(`Failed to get home page from NovelBuddy: ${error.message}`);
    }
  }
}

module.exports = NovelBuddy;
