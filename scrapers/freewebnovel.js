const requestManager = require('../utils/requestManager');
const cheerio = require('cheerio');

const BASE_URL = 'https://freewebnovel.com';

class FreeWebNovel {
  constructor() {
    this.baseUrl = BASE_URL;
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
   * Clean novel slug / ID
   */
  cleanSlug(slugOrUrl) {
    if (!slugOrUrl) return '';
    return slugOrUrl
      .replace(/^https?:\/\/[^\/]+\//, '')
      .replace(/^\//, '')
      .replace(/\.html$/, '')
      .replace(/\/$/, '');
  }

  /**
   * Search novels by query string
   */
  async searchNovels(query, page = 1) {
    try {
      const keywordUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
      const searchKeyUrl = `${this.baseUrl}/search?searchkey=${encodeURIComponent(query)}&page=${page}`;
      
      let html = '';
      try {
        html = await requestManager.request(keywordUrl, 'GET', {}, {}, 'cloudscraper');
      } catch (e1) {
        try {
          html = await requestManager.request(searchKeyUrl, 'GET', {}, {}, 'cloudscraper');
        } catch (e2) {
          console.warn(`FreeWebNovel search query failed: ${e1.message}`);
          return [];
        }
      }

      if (!html || typeof html !== 'string') return [];

      const $ = cheerio.load(html);
      const results = [];

      $('.li-row, .col-novel, .item, .ul-list1 li, .con-wrap li').each((i, el) => {
        const titleEl = $(el).find('.tit a, .title a, h3 a').first();
        const title = titleEl.text().trim();
        const href = titleEl.attr('href') || $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
        const latestChapter = $(el).find('.chapter a, .latest-chapter').text().trim();
        const genres = $(el).find('.genres a, .genre a').map((_, g) => $(g).text().trim()).get();

        if (href) {
          const id = this.cleanSlug(href);
          if (id && !results.some(r => r.id === id)) {
            results.push({
              id,
              title: title || id,
              cover: this.formatUrl(cover),
              genres,
              latestChapter: latestChapter || null,
              url: this.formatUrl(href)
            });
          }
        }
      });

      return results;
    } catch (error) {
      console.error('Error searching novels on FreeWebNovel:', error.message);
      throw new Error(`Failed to search novels on FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Get detailed novel information
   */
  async getNovelInfo(id) {
    try {
      const slug = this.cleanSlug(id);
      const url = `${this.baseUrl}/${slug}.html`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'cloudscraper');
      const $ = cheerio.load(html);

      const title = $('h1.tit, h1.title, .m-desc h1').text().trim() || slug;
      const cover = this.formatUrl($('.pic img, .m-img img, .cover img').attr('src') || $('.pic img, .cover img').attr('data-src'));
      
      const author = $('.item:contains("Author"), .author a, .m-desc .txt:contains("Author")')
        .text().replace(/^Author:\s*/i, '').trim() || null;

      const genres = $('.item:contains("Genre") a, .genres a, a[href*="/genre/"]')
        .map((i, el) => $(el).text().trim()).get();

      const status = $('.item:contains("Status") a, .status')
        .text().replace(/^Status:\s*/i, '').trim() || 'Ongoing';

      const ratingText = $('.score, .rating, .star').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : 0;

      const description = $('.inner, .txt .desc, .summary, .description').text().trim();
      const latestChapter = $('.item:contains("Latest") a, .latest-chapter a').text().trim() || null;

      return {
        id: slug,
        title,
        author,
        cover,
        status,
        rating,
        genres: [...new Set(genres)],
        description,
        latestChapter,
        url: `${this.baseUrl}/${slug}.html`
      };
    } catch (error) {
      console.error(`Error getting novel info for ${id} on FreeWebNovel:`, error.message);
      throw new Error(`Failed to get novel info from FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Get chapters for a novel
   */
  async getChapters(id, page = 1) {
    try {
      const slug = this.cleanSlug(id);
      const url = `${this.baseUrl}/${slug}.html`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'cloudscraper');
      const $ = cheerio.load(html);

      const chapters = [];
      $('.m-newest2 ul.ul-list5 li a, .ul-list5 li a, .chapter-list a, ul.list-chapter a, a[href*="/chapter-"]').each((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).attr('title');
        const chapSlugMatch = href ? href.match(/\/([^\/]+)\.html$/) || href.match(/\/([^\/]+)$/) : null;
        const chapterId = chapSlugMatch ? chapSlugMatch[1] : `chapter-${i + 1}`;
        const chNumMatch = title ? title.match(/Chapter\s+(\d+(?:\.\d+)?)/i) : null;

        if (href && !chapters.some(c => c.chapterId === chapterId)) {
          chapters.push({
            chapterId,
            chapterNumber: chNumMatch ? parseFloat(chNumMatch[1]) : (i + 1),
            title: title.replace(/\s+/g, ' ').trim(),
            url: this.formatUrl(href)
          });
        }
      });

      return {
        novelId: slug,
        pagination: {
          currentPage: parseInt(page, 10) || 1,
          totalChapters: chapters.length,
          limit: chapters.length,
          hasPrevious: false,
          hasNext: false
        },
        totalChapters: chapters.length,
        chapters
      };
    } catch (error) {
      console.error(`Error getting chapters for ${id} on FreeWebNovel:`, error.message);
      throw new Error(`Failed to get chapters from FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Read chapter text content
   */
  async getChapterContent(novelId, chapterId) {
    try {
      const nSlug = this.cleanSlug(novelId);
      let cSlug = this.cleanSlug(chapterId);

      if (!cSlug.startsWith('chapter-') && !cSlug.includes('/')) {
        cSlug = `chapter-${cSlug}`;
      }

      const url = `${this.baseUrl}/${nSlug}/${cSlug}.html`;
      const html = await requestManager.request(url, 'GET', {}, {}, 'cloudscraper');
      const $ = cheerio.load(html);

      const title = $('h1.tit, h1.title, .chapter-title, .title').text().trim() || `${nSlug} ${cSlug}`;
      const contentEl = $('#article, .txt, .chapter-content, .content, .reading-content');

      contentEl.find('script, style, iframe, .ads, .ad, div[style*="text-align:center"]').remove();

      const paragraphs = [];
      contentEl.find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text && !text.toLowerCase().includes('freewebnovel')) {
          paragraphs.push(text);
        }
      });

      if (paragraphs.length === 0) {
        const rawText = contentEl.text().trim();
        rawText.split('\n').map(p => p.trim()).filter(Boolean).forEach(p => {
          if (!p.toLowerCase().includes('freewebnovel')) {
            paragraphs.push(p);
          }
        });
      }

      const prevHref = $('a#prev_url, a.prev, a[rel="prev"]').attr('href');
      const nextHref = $('a#next_url, a.next, a[rel="next"]').attr('href');

      return {
        novelId: nSlug,
        chapterId: cSlug,
        title,
        wordCount: paragraphs.join(' ').split(/\s+/).length,
        readingTimeMinutes: Math.ceil(paragraphs.join(' ').split(/\s+/).length / 200),
        paragraphs,
        html: contentEl.html() || '',
        prevChapterId: prevHref ? this.cleanSlug(prevHref) : null,
        nextChapterId: nextHref ? this.cleanSlug(nextHref) : null
      };
    } catch (error) {
      console.error(`Error reading chapter ${chapterId} of ${novelId} on FreeWebNovel:`, error.message);
      throw new Error(`Failed to read chapter from FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Helper to parse book cards
   */
  async parseBookList(url) {
    const html = await requestManager.request(url, 'GET', {}, {}, 'cloudscraper');
    const $ = cheerio.load(html);

    const results = [];
    $('.li-row, .col-novel, .item, .ul-list1 li, .con-wrap li').each((i, el) => {
      const titleEl = $(el).find('.tit a, .title a, h3 a').first();
      const title = titleEl.text().trim();
      const href = titleEl.attr('href') || $(el).find('a').attr('href');
      const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
      const latestChapter = $(el).find('.chapter a, .latest-chapter').text().trim();

      if (href) {
        const id = this.cleanSlug(href);
        if (id && !results.some(r => r.id === id)) {
          results.push({
            id,
            title: title || id,
            cover: this.formatUrl(cover),
            latestChapter: latestChapter || null,
            url: this.formatUrl(href)
          });
        }
      }
    });

    return results;
  }

  /**
   * Get latest released novels
   */
  async getLatest(page = 1) {
    try {
      const url = page === 1 
        ? `${this.baseUrl}/sort/latest-novel/` 
        : `${this.baseUrl}/sort/latest-novel/${page}/`;
      return await this.parseBookList(url);
    } catch (error) {
      console.error('Error getting latest novels on FreeWebNovel:', error.message);
      throw new Error(`Failed to get latest novels from FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Get ranking / popular novels
   */
  async getRanking(page = 1) {
    try {
      const url = page === 1 
        ? `${this.baseUrl}/sort/most-popular/` 
        : `${this.baseUrl}/sort/most-popular/${page}/`;
      return await this.parseBookList(url);
    } catch (error) {
      console.error('Error getting ranking novels on FreeWebNovel:', error.message);
      throw new Error(`Failed to get ranking novels from FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Get all available genres
   */
  async getGenres() {
    try {
      const html = await requestManager.request(this.baseUrl, 'GET', {}, {}, 'cloudscraper');
      const $ = cheerio.load(html);

      const genres = [];
      $('a[href*="/genre/"]').each((i, el) => {
        const href = $(el).attr('href');
        const name = $(el).text().trim();
        const slugMatch = href ? href.match(/\/genre\/([^\/]+)/) : null;
        const slug = slugMatch ? slugMatch[1] : name;
        if (name && slug && !genres.some(g => g.slug === slug)) {
          genres.push({
            name,
            slug,
            url: this.formatUrl(href)
          });
        }
      });

      return genres;
    } catch (error) {
      console.error('Error getting genres on FreeWebNovel:', error.message);
      throw new Error(`Failed to get genres from FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Get novels by genre
   */
  async getNovelsByGenre(genre, page = 1) {
    try {
      const gSlug = genre.charAt(0).toUpperCase() + genre.slice(1);
      const url = page === 1 
        ? `${this.baseUrl}/genre/${gSlug}/` 
        : `${this.baseUrl}/genre/${gSlug}/${page}/`;
      return await this.parseBookList(url);
    } catch (error) {
      console.error(`Error getting novels for genre ${genre} on FreeWebNovel:`, error.message);
      throw new Error(`Failed to get novels for genre from FreeWebNovel: ${error.message}`);
    }
  }

  /**
   * Get homepage featured & latest
   */
  async getHomePage() {
    try {
      const [popular, latest] = await Promise.all([
        this.getRanking(1),
        this.getLatest(1)
      ]);

      return {
        featured: popular.slice(0, 6),
        popular: popular.slice(0, 10),
        latestUpdates: latest
      };
    } catch (error) {
      console.error('Error getting home page on FreeWebNovel:', error.message);
      throw new Error(`Failed to get home page from FreeWebNovel: ${error.message}`);
    }
  }
}

module.exports = FreeWebNovel;
